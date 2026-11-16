import { FACES } from './components/DiceDisplay'

/*
 * Pure 3D maths for the rolling dice: a unit cube rotated, lit and projected with perspective to SVG paths.
 * Screen axes: x right, y down, z toward the viewer. Every function is a worklet so Reanimated can run the
 * projection on the UI thread each frame; in Jest they are plain functions.
 */

export type Vec3 = [number, number, number]
/** Row-major 3×3 rotation. */
export type Mat3 = [number, number, number, number, number, number, number, number, number]
/** The tumble: two rotations (axis, total angle in radians) that unwind to nothing as the die lands. */
export type Spin = { a1: Vec3; t1: number; a2: Vec3; t2: number }

/**
 * Each face's outward normal n and the right/down directions its pips are laid out along (FACES' x and y).
 * r × d = n on every face, so a face shown front-on reads as DiceDisplay draws it. Opposite faces sum to 7.
 */
export const FACE_DEFS: Record<number, { n: Vec3; r: Vec3; d: Vec3 }> = {
  1: { n: [0, 0, 1], r: [1, 0, 0], d: [0, 1, 0] },
  6: { n: [0, 0, -1], r: [-1, 0, 0], d: [0, 1, 0] },
  2: { n: [0, -1, 0], r: [1, 0, 0], d: [0, 0, 1] },
  5: { n: [0, 1, 0], r: [1, 0, 0], d: [0, 0, -1] },
  3: { n: [1, 0, 0], r: [0, 0, -1], d: [0, 1, 0] },
  4: { n: [-1, 0, 0], r: [0, 0, 1], d: [0, 1, 0] },
}

/** Camera distance in die edges: lower is stronger perspective. */
const CAMERA = 4.5
/**
 * Light comes from the viewer: a face square to the viewer is drawn in exactly the dice colour, and a face turned
 * away darkens toward SHADE_MIN of it. That shading is all that separates faces: there is no outline.
 */
const SHADE_MIN = 0.45
/** Face corner rounding, in face units. Faces are drawn full size, so the die is one colour edge to edge. */
const CORNER = 0.12
const PIP_R = 0.085

/** The dice's colours: the face colour (every face is a shade of it) and the pips. Hex #rrggbb. */
export type DiceColors = { face: string; pips: string }
/** Ivory dice, near-black pips. A future dice-colour setting supplies its own DiceColors. */
export const DEFAULT_DICE_COLORS: DiceColors = { face: '#faf7ee', pips: '#13131f' }

/** #rrggbb as [r, g, b], 0–255, for projectDie's shading. */
export function faceRgb(hex: string): Vec3 {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function dot(a: Vec3, b: Vec3): number {
  'worklet'
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  'worklet'
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function normalize(a: Vec3): Vec3 {
  'worklet'
  const l = Math.sqrt(dot(a, a))
  return [a[0] / l, a[1] / l, a[2] / l]
}

export function apply(m: Mat3, v: Vec3): Vec3 {
  'worklet'
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

export function mul(a: Mat3, b: Mat3): Mat3 {
  'worklet'
  const out: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
    }
  }
  return out
}

/** Rotation by `angle` radians about `axis` (Rodrigues). */
export function axisAngle(axis: Vec3, angle: number): Mat3 {
  'worklet'
  const [x, y, z] = normalize(axis)
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const t = 1 - c
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ]
}

/** Resting: the rolled face square to the viewer and upright, as seen from directly above the table. */
export function restOrientation(value: number): Mat3 {
  'worklet'
  const { r, d, n } = FACE_DEFS[value]
  // Rows r, d, n map that face's frame onto the screen's x, y, z.
  return [r[0], r[1], r[2], d[0], d[1], d[2], n[0], n[1], n[2]]
}

/** Orientation at eased progress e (0 → 1): the spin unwinds, so e = 1 is exactly the rest orientation. */
export function tumbleOrientation(value: number, e: number, spin: Spin): Mat3 {
  'worklet'
  const left = 1 - e
  const s = mul(axisAngle(spin.a1, spin.t1 * left), axisAngle(spin.a2, spin.t2 * left))
  return mul(restOrientation(value), s)
}

/** A fresh random tumble: two tilted axes, 1–1.5 turns each. */
export function randomSpin(): Spin {
  const axis = (): Vec3 => [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1 || 0.5]
  const turns = () => (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random()) * Math.PI
  return { a1: axis(), t1: turns(), a2: axis(), t2: turns() }
}

/** How far a face turns toward the viewer: its normal's z after the rotation. */
function facing(m: Mat3, v: number): number {
  'worklet'
  return apply(m, FACE_DEFS[v].n)[2]
}

/** Faces turned toward the camera (seen from CAMERA edges away). */
export function visibleFaces(m: Mat3): number[] {
  'worklet'
  const out: number[] = []
  for (let v = 1; v <= 6; v++) {
    const n = apply(m, FACE_DEFS[v].n)
    // Camera at (0, 0, CAMERA); the face centre is n / 2.
    const toCam: Vec3 = [-n[0] / 2, -n[1] / 2, CAMERA - n[2] / 2]
    if (dot(n, toCam) > 0) out.push(v)
  }
  return out
}

/** The face most toward the viewer: what the die reads as. */
export function frontFace(m: Mat3): number {
  'worklet'
  let best = 1
  for (let v = 2; v <= 6; v++) if (facing(m, v) > facing(m, best)) best = v
  return best
}

/**
 * Where the die is on its throw at eased progress e, relative to its resting spot: in from `dx` to the right and
 * `dy` below, hopping three times (lift, upward) with each bounce lower. e = 1 is the resting spot.
 */
export function throwOffset(e: number, dx: number, dy: number): { x: number; y: number; lift: number } {
  'worklet'
  const left = 1 - e
  if (left <= 0) return { x: 0, y: 0, lift: 0 }
  return { x: dx * left, y: dy * left, lift: Math.abs(Math.sin(3 * Math.PI * e)) * left * dy * 0.9 }
}

function project(p: Vec3, size: number): string {
  'worklet'
  // Scaled so the resting top face (half an edge nearer the camera) is exactly `size` across.
  const k = (CAMERA - 0.5) / (CAMERA - p[2])
  return (p[0] * k * size).toFixed(1) + ' ' + (p[1] * k * size).toFixed(1)
}

/** A point on face v at face coordinates (fx, fy) ∈ [0, 1]², rotated, in edge units. */
function facePoint(m: Mat3, v: number, fx: number, fy: number): Vec3 {
  'worklet'
  const { n, r, d } = FACE_DEFS[v]
  const u = fx - 0.5
  const w = fy - 0.5
  return apply(m, [n[0] / 2 + u * r[0] + w * d[0], n[1] / 2 + u * r[1] + w * d[1], n[2] / 2 + u * r[2] + w * d[2]])
}

function polygon(pts: string[]): string {
  'worklet'
  return 'M' + pts.join(' L') + ' Z'
}

/** The rounded, inset face outline in face coordinates: four quarter arcs of three steps. */
function roundedOutline(): Array<[number, number]> {
  'worklet'
  const lo = CORNER
  const hi = 1 - lo
  const corners: Array<[number, number, number]> = [[hi, lo, -Math.PI / 2], [hi, hi, 0], [lo, hi, Math.PI / 2], [lo, lo, Math.PI]]
  const out: Array<[number, number]> = []
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 3; i++) {
      const a = a0 + (i / 3) * (Math.PI / 2)
      out.push([cx + CORNER * Math.cos(a), cy + CORNER * Math.sin(a)])
    }
  }
  return out
}

function shade(m: Mat3, v: number): number {
  'worklet'
  return SHADE_MIN + (1 - SHADE_MIN) * Math.max(0, facing(m, v))
}

export type DieFrame = {
  /** Per face (index value − 1): its rounded outline ('' when hidden) and shaded fill. */
  faces: Array<{ d: string; fill: string }>
  /** Every visible pip, one subpath each. */
  pips: string
}

/** The die drawn at rotation m with edge `size`, centred on (0, 0), its faces shades of `rgb` (see faceRgb). */
export function projectDie(m: Mat3, size: number, rgb: Vec3): DieFrame {
  'worklet'
  const vis = visibleFaces(m)
  const outline = roundedOutline()
  let pips = ''
  const faces: Array<{ d: string; fill: string }> = []
  for (let v = 1; v <= 6; v++) {
    if (vis.indexOf(v) < 0) {
      // Nothing is drawn (empty path); the fill must still parse as a colour for Reanimated (not 'none').
      faces.push({ d: '', fill: 'rgba(0,0,0,0)' })
      continue
    }
    const b = shade(m, v)
    faces.push({
      d: polygon(outline.map(([x, y]) => project(facePoint(m, v, x, y), size))),
      fill: 'rgb(' + Math.round(rgb[0] * b) + ',' + Math.round(rgb[1] * b) + ',' + Math.round(rgb[2] * b) + ')',
    })
    for (const [px, py] of FACES[v]) {
      const ring: string[] = []
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        ring.push(project(facePoint(m, v, px + PIP_R * Math.cos(a), py + PIP_R * Math.sin(a)), size))
      }
      pips += polygon(ring)
    }
  }
  return { faces, pips }
}
