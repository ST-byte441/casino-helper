import { Pocket, RouletteBetKind, RouletteWheel } from '../../lib/types'
import { allBets, betById, makeBetId, pocketColor, pocketLabel, zeroPockets } from './engine'

export type BoardOrientation = 'portrait' | 'landscape'
export type Rect = { x: number; y: number; w: number; h: number }
export type BoardCell = {
  key: string
  label: string
  rect: Rect
  color: 'red' | 'black' | 'green' | 'felt'
  betId: string | null
}
export type BoardLayout = {
  width: number
  height: number
  cells: BoardCell[]
  anchors: Record<string, { x: number; y: number }>
}
export type DragSource = { type: 'tray'; amount: number } | { type: 'stack'; betId: string }
export type DropAction =
  | { type: 'place'; betId: string; amount: number }
  | { type: 'move'; from: string; to: string }
  | { type: 'remove'; betId: string }
  | { type: 'none' }

// Hit tolerance in cell units. Along the zero boundary the targets are denser
// (zero dividers sit between number lines), so a tighter tolerance is used there.
const TOL = 0.22
const ZERO_EDGE_TOL = 0.12
const STRIP = 0.6 // outside strip thickness relative to a grid cell

const EVEN_MONEY: { id: string; label: string }[] = [
  { id: 'low', label: '1-18' }, { id: 'even', label: 'EVEN' }, { id: 'red', label: 'RED' },
  { id: 'black', label: 'BLACK' }, { id: 'odd', label: 'ODD' }, { id: 'high', label: '19-36' },
]
const DOZEN_LABELS = ['1st 12', '2nd 12', '3rd 12']

/*
 * Grid-local coordinates (both orientations):
 *   u: across the three number columns, 0 at the street edge, column c spans [c-1, c].
 *   v: along the twelve rows, 0 at the zero boundary, row r spans [r-1, r]; zero area is v in [-zd, 0).
 * Zero cell i (zeroPockets order) spans u in [i*3/n, (i+1)*3/n].
 */
type Frame = { portrait: boolean; gx: number; gy: number; cw: number; ch: number; zd: number }

function toXY(f: Frame, u: number, v: number) {
  return f.portrait
    ? { x: f.gx + u * f.cw, y: f.gy + v * f.ch }
    : { x: f.gx + v * f.cw, y: f.gy + (3 - u) * f.ch }
}

function toUV(f: Frame, x: number, y: number) {
  return f.portrait
    ? { u: (x - f.gx) / f.cw, v: (y - f.gy) / f.ch }
    : { u: (f.gy + 3 * f.ch - y) / f.ch, v: (x - f.gx) / f.cw }
}

function rectUV(f: Frame, u0: number, u1: number, v0: number, v1: number): Rect {
  const a = toXY(f, u0, v0), b = toXY(f, u1, v1)
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

const rowOf = (n: number) => Math.ceil(n / 3)
const colOf = (n: number) => ((n - 1) % 3) + 1
const num = (r: number, c: number) => 3 * (r - 1) + c
const zeroSpan = (i: number, n: number) => [(i * 3) / n, ((i + 1) * 3) / n]
const centreOf = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

export function buildLayout(wheel: RouletteWheel, orientation: BoardOrientation, width: number, height: number): BoardLayout {
  const portrait = orientation === 'portrait'
  let f: Frame
  if (portrait) {
    const cw = width / (3 + 2 * STRIP)
    const ch = height / 14
    f = { portrait, gx: 2 * STRIP * cw, gy: ch, cw, ch, zd: 1 }
  } else {
    const cw = width / 14
    const ch = height / (3 + 2 * STRIP)
    f = { portrait, gx: cw, gy: 0, cw, ch, zd: 1 }
  }

  const cells: BoardCell[] = []
  const zeros = zeroPockets(wheel)
  zeros.forEach((p, i) => {
    const [u0, u1] = zeroSpan(i, zeros.length)
    const id = makeBetId('straight', [p])
    cells.push({ key: id, label: pocketLabel(p), rect: rectUV(f, u0, u1, -f.zd, 0), color: 'green', betId: id })
  })
  for (let n = 1; n <= 36; n++) {
    const r = rowOf(n), c = colOf(n)
    const id = makeBetId('straight', [n])
    cells.push({ key: id, label: String(n), rect: rectUV(f, c - 1, c, r - 1, r), color: pocketColor(n), betId: id })
  }

  const { cw, ch, gx, gy } = f
  for (let d = 1; d <= 3; d++) {
    const rect = portrait
      ? { x: 0, y: gy + 4 * (d - 1) * ch, w: STRIP * cw, h: 4 * ch }
      : { x: gx + 4 * (d - 1) * cw, y: 3 * ch, w: 4 * cw, h: STRIP * ch }
    cells.push({ key: `dozen:${d}`, label: DOZEN_LABELS[d - 1], rect, color: 'felt', betId: `dozen:${d}` })
  }
  EVEN_MONEY.forEach(({ id, label }, k) => {
    const rect = portrait
      ? { x: STRIP * cw, y: gy + 2 * k * ch, w: STRIP * cw, h: 2 * ch }
      : { x: gx + 2 * k * cw, y: (3 + STRIP) * ch, w: 2 * cw, h: STRIP * ch }
    const color = id === 'red' ? 'red' : id === 'black' ? 'black' : 'felt'
    cells.push({ key: id, label, rect, color, betId: id })
  })
  for (let c = 1; c <= 3; c++) {
    const rect = rectUV(f, c - 1, c, 12, 13)
    cells.push({ key: `column:${c}`, label: '2 to 1', rect, color: 'felt', betId: `column:${c}` })
  }

  const anchors: BoardLayout['anchors'] = {}
  const cellById = new Map(cells.map(c => [c.key, c]))
  for (const bet of allBets(wheel)) {
    const box = cellById.get(bet.id)
    if (box) {
      anchors[bet.id] = centreOf(box.rect)
      continue
    }
    const { u, v } = anchorUV(bet.kind, bet.pockets, zeros, f.zd)
    anchors[bet.id] = toXY(f, u, v)
  }

  return { width, height, cells, anchors }
}

function anchorUV(kind: RouletteBetKind, pockets: Pocket[], zeros: Pocket[], zd: number): { u: number; v: number } {
  const nums = pockets.filter(p => p > 0).sort((a, b) => a - b)
  const zs = zeros.map((z, i) => ({ z, i })).filter(({ z }) => pockets.includes(z))
  const lo = nums[0]
  const divider = () => zeroSpan(zs[0].i, zeros.length)[1]
  switch (kind) {
    case 'street':
      return { u: 0, v: rowOf(lo) - 0.5 }
    case 'sixline':
      return { u: 0, v: rowOf(lo) }
    case 'corner':
      return { u: colOf(lo), v: rowOf(lo) }
    case 'firstFour':
    case 'firstFive':
      return { u: 0, v: 0 }
    case 'basket':
      return { u: nums.length === 2 ? colOf(lo) : divider(), v: 0 }
    case 'split': {
      if (nums.length === 0) return { u: divider(), v: -zd / 2 }
      if (nums.length === 1) {
        const [a, b] = zeroSpan(zs[0].i, zeros.length)
        const c = colOf(lo)
        return { u: (Math.max(a, c - 1) + Math.min(b, c)) / 2, v: 0 }
      }
      const hi = nums[1]
      if (rowOf(lo) === rowOf(hi)) return { u: colOf(lo), v: rowOf(lo) - 0.5 }
      return { u: colOf(lo) - 0.5, v: rowOf(lo) }
    }
    default:
      throw new Error(`no anchor rule for ${kind}`)
  }
}

function frameOf(layout: BoardLayout): Frame {
  const get = (id: string) => layout.cells.find(c => c.key === id)!.rect
  const r1 = get('straight:1'), r2 = get('straight:2'), r0 = get('straight:0')
  const portrait = Math.abs(r1.y - r2.y) < 1e-6
  const cw = r1.w, ch = r1.h
  return portrait
    ? { portrait, gx: r1.x, gy: r1.y, cw, ch, zd: r0.h / ch }
    : { portrait, gx: r1.x, gy: r1.y - 2 * ch, cw, ch, zd: r0.w / cw }
}

function valid(wheel: RouletteWheel, kind: RouletteBetKind, pockets: Pocket[]): string | null {
  const id = makeBetId(kind, pockets)
  return betById(wheel, id) ? id : null
}

export function hitTest(layout: BoardLayout, wheel: RouletteWheel, x: number, y: number): string | null {
  const f = frameOf(layout)
  const { u, v } = toUV(f, x, y)
  if (u >= 0 && u <= 3 && v >= -f.zd && v < 12) return hitGrid(wheel, u, v)
  const box = layout.cells.find(c =>
    c.betId && x >= c.rect.x && x <= c.rect.x + c.rect.w && y >= c.rect.y && y <= c.rect.y + c.rect.h)
  return box ? box.betId : null
}

function hitGrid(wheel: RouletteWheel, u: number, v: number): string | null {
  const zeros = zeroPockets(wheel)
  const n = zeros.length
  const c = Math.min(3, Math.floor(u) + 1)
  const ul = Math.round(u)
  const zeroAt = (at: number) => zeros.filter((_, i) => {
    const [a, b] = zeroSpan(i, n)
    return at >= a - 1e-9 && at <= b + 1e-9
  })
  const nearDivider = (tol: number) => {
    for (let i = 1; i < n; i++) if (Math.abs(u - (i * 3) / n) < tol) return i
    return 0
  }

  // Zero / grid boundary
  if (Math.abs(v) < TOL) {
    const nearLine = Math.abs(u - ul) < ZERO_EDGE_TOL && ul <= 2
    if (nearLine && ul === 0) {
      return n === 1 ? valid(wheel, 'firstFour', [...zeros, 1, 2, 3]) : valid(wheel, 'firstFive', [...zeros, 1, 2, 3])
    }
    if (nearLine) return valid(wheel, 'basket', [...zeroAt(ul), ul, ul + 1])
    const d = nearDivider(ZERO_EDGE_TOL)
    if (d) return valid(wheel, 'basket', [zeros[d - 1], zeros[d], c])
    return valid(wheel, 'split', [...zeroAt(u).slice(0, 1), c])
  }

  // Zero area
  if (v < 0) {
    const d = nearDivider(TOL)
    if (d) return valid(wheel, 'split', [zeros[d - 1], zeros[d]])
    return valid(wheel, 'straight', zeroAt(u).slice(0, 1))
  }

  // Number grid
  const r = Math.min(12, Math.floor(v) + 1)
  const vl = Math.round(v)
  const nearRow = Math.abs(v - vl) < TOL && vl >= 1 && vl <= 11
  const nearCol = Math.abs(u - ul) < TOL && ul <= 2
  if (nearCol && ul === 0) {
    return nearRow
      ? valid(wheel, 'sixline', [0, 1, 2, 3, 4, 5].map(k => num(vl, 1) + k))
      : valid(wheel, 'street', [num(r, 1), num(r, 2), num(r, 3)])
  }
  if (nearCol && nearRow) return valid(wheel, 'corner', [num(vl, ul), num(vl, ul + 1), num(vl + 1, ul), num(vl + 1, ul + 1)])
  if (nearCol) return valid(wheel, 'split', [num(r, ul), num(r, ul + 1)])
  if (nearRow) return valid(wheel, 'split', [num(vl, c), num(vl + 1, c)])
  return valid(wheel, 'straight', [num(r, c)])
}

export function resolveDrop(layout: BoardLayout, wheel: RouletteWheel, source: DragSource, x: number, y: number): DropAction {
  const offBoard = x < 0 || x > layout.width || y < 0 || y > layout.height
  if (offBoard) return source.type === 'stack' ? { type: 'remove', betId: source.betId } : { type: 'none' }
  const id = hitTest(layout, wheel, x, y)
  if (!id) return { type: 'none' }
  if (source.type === 'tray') return { type: 'place', betId: id, amount: source.amount }
  return id === source.betId ? { type: 'none' } : { type: 'move', from: source.betId, to: id }
}
