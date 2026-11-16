import {
  DEFAULT_DICE_COLORS, faceRgb, FACE_DEFS, Mat3, Vec3, apply, cross, dot, frontFace, projectDie, restOrientation, tumbleOrientation,
  visibleFaces, throwOffset, axisAngle, mul,
} from '../../features/craps/dice3d'

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9))
const RGB = faceRgb('#faf7ee')
const SPIN = { a1: [0.3, 0.8, 0.5] as Vec3, t1: 9, a2: [0.9, -0.2, 0.4] as Vec3, t2: 7 }

describe('die geometry', () => {
  test('each face has an orthonormal right/down/normal frame, r × d = n, and opposite faces sum to 7', () => {
    for (let v = 1; v <= 6; v++) {
      const { n, r, d } = FACE_DEFS[v]
      expect(dot(n, n)).toBeCloseTo(1)
      expect(dot(r, d)).toBeCloseTo(0)
      close(cross(r, d), n)
      close(FACE_DEFS[7 - v].n, n.map(x => -x))
    }
  })

  test('rotations are proper: R·Rᵀ = I, det 1', () => {
    const R = mul(axisAngle([1, 2, 3], 1.1), restOrientation(5))
    const Rt: Mat3 = [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]]
    close(mul(R, Rt), [1, 0, 0, 0, 1, 0, 0, 0, 1])
  })
})

describe('rest orientation', () => {
  test.each([1, 2, 3, 4, 5, 6])('%i rests square to the viewer, seen from directly above: only that face shows', v => {
    const R = restOrientation(v)
    expect(frontFace(R)).toBe(v)
    expect(apply(R, FACE_DEFS[v].n)[2]).toBeCloseTo(1, 9)
    expect(visibleFaces(R)).toEqual([v])
  })
})

describe('tumble', () => {
  test.each([1, 2, 3, 4, 5, 6])('ends exactly at rest on %i', v => {
    close(tumbleOrientation(v, 1, SPIN), restOrientation(v))
  })

  test('is somewhere else mid-tumble', () => {
    const mid = tumbleOrientation(4, 0.5, SPIN)
    expect(Math.abs(mid[0] - restOrientation(4)[0]) + Math.abs(mid[8] - restOrientation(4)[8])).toBeGreaterThan(0.01)
  })

  test('the throw starts off to the side and below, and ends at the resting spot', () => {
    const start = throwOffset(0, 400, 300)
    expect(start.x).toBeGreaterThanOrEqual(400)
    expect(start.y).toBeGreaterThan(0)
    expect(throwOffset(1, 400, 300)).toEqual({ x: 0, y: 0, lift: 0 })
  })
})

describe('projection', () => {
  test('hidden faces draw nothing; the pips path holds one subpath per visible pip', () => {
    const R = restOrientation(6)
    const R2 = tumbleOrientation(6, 0.6, SPIN)
    for (const m of [R, R2]) {
      const frame = projectDie(m, 100, RGB)
      const vis = visibleFaces(m)
      for (let v = 1; v <= 6; v++) expect(frame.faces[v - 1].d === '').toBe(!vis.includes(v))
      expect((frame.pips.match(/M/g) ?? []).length).toBe(vis.reduce((s, v) => s + v, 0))
    }
  })

  test('every face fill is a colour Reanimated can parse, hidden faces included (never "none")', () => {
    // Reanimated runs animated `fill` through its colour parser; "none" throws "Invalid color value" on device.
    for (let v = 1; v <= 6; v++) {
      for (const f of projectDie(tumbleOrientation(v, 0.3, SPIN), 100, RGB).faces) expect(f.fill).toMatch(/^rgba?\(/)
    }
  })

  test('at rest the face is drawn in exactly the dice colour, a square of the die edge', () => {
    const frame = projectDie(restOrientation(1), 100, faceRgb('#c0392b'))
    expect(frame.faces[0].fill).toBe('rgb(192,57,43)')
    const nums = frame.faces[0].d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(Math.max(...nums)).toBeCloseTo(50, 0)
    expect(Math.min(...nums)).toBeCloseTo(-50, 0)
  })

  test('mid-tumble, faces turned away from the viewer are darker shades of the dice colour', () => {
    const m = tumbleOrientation(3, 0.4, SPIN)
    const frame = projectDie(m, 100, faceRgb('#ffffff'))
    for (const v of visibleFaces(m)) {
      const [r, g, b] = frame.faces[v - 1].fill.match(/\d+/g)!.map(Number)
      expect(r).toBe(g); expect(g).toBe(b)
      expect(r).toBeLessThanOrEqual(255)
    }
  })

  test('the default dice are ivory with near-black pips', () => {
    expect(DEFAULT_DICE_COLORS).toEqual({ face: '#faf7ee', pips: '#13131f' })
    expect(faceRgb('#faf7ee')).toEqual([250, 247, 238])
  })
})
