import { buildLayout, hitTest, resolveDrop, BoardLayout, BoardOrientation, Rect } from '../../features/roulette/layout'
import { allBets } from '../../features/roulette/engine'
import { RouletteWheel } from '../../lib/types'

const wheels: RouletteWheel[] = ['single', 'double', 'triple']
const sizes: Record<BoardOrientation, [number, number]> = { portrait: [360, 640], landscape: [640, 300] }
const orientations: BoardOrientation[] = ['portrait', 'landscape']

const make = (w: RouletteWheel, o: BoardOrientation) => buildLayout(w, o, ...sizes[o])

function cell(layout: BoardLayout, label: string): Rect {
  const c = layout.cells.find(c => c.label === label) ?? layout.cells.find(c => c.key === label)
  if (!c) throw new Error(`no cell ${label}`)
  return c.rect
}

const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

// Midpoint of the edge two touching rects share.
function sharedEdge(a: Rect, b: Rect) {
  const eps = 1e-6
  if (Math.abs(a.x + a.w - b.x) < eps || Math.abs(b.x + b.w - a.x) < eps) {
    const x = Math.abs(a.x + a.w - b.x) < eps ? b.x : a.x
    const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h)
    return { x, y: (y0 + y1) / 2 }
  }
  const y = Math.abs(a.y + a.h - b.y) < eps ? b.y : a.y
  const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w)
  return { x: (x0 + x1) / 2, y }
}

// The street edge is the left grid edge in portrait, the bottom grid edge in landscape.
function streetEdge(o: BoardOrientation, r: Rect) {
  return o === 'portrait' ? { x: r.x, y: r.y + r.h / 2 } : { x: r.x + r.w / 2, y: r.y + r.h }
}

describe.each(orientations)('%s layout', (o) => {
  const L = make('double', o)
  const hit = (p: { x: number; y: number }, l: BoardLayout = L, w: RouletteWheel = 'double') => hitTest(l, w, p.x, p.y)

  it('centre of 17 is straight:17', () => expect(hit(centre(cell(L, '17')))).toBe('straight:17'))
  it('17|20 edge is split:17-20', () => expect(hit(sharedEdge(cell(L, '17'), cell(L, '20')))).toBe('split:17-20'))
  it('17|18 edge is split:17-18', () => expect(hit(sharedEdge(cell(L, '17'), cell(L, '18')))).toBe('split:17-18'))
  it('17/18/20/21 corner is a corner bet', () => {
    const cs = ['17', '18', '20', '21'].map(n => centre(cell(L, n)))
    const p = { x: cs.reduce((s, c) => s + c.x, 0) / 4, y: cs.reduce((s, c) => s + c.y, 0) / 4 }
    expect(hit(p)).toBe('corner:17-18-20-21')
  })
  it('street edge beside 7 is street:7-8-9', () => expect(hit(streetEdge(o, cell(L, '7')))).toBe('street:7-8-9'))
  it('street edge at 7|10 is sixline', () => {
    const a = streetEdge(o, cell(L, '7')), b = streetEdge(o, cell(L, '10'))
    expect(hit({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })).toBe('sixline:7-8-9-10-11-12')
  })
  it('red box', () => expect(hit(centre(cell(L, 'red')))).toBe('red'))
  it('dozen 2 box', () => expect(hit(centre(cell(L, 'dozen:2')))).toBe('dozen:2'))
  it('column 3 box', () => expect(hit(centre(cell(L, 'column:3')))).toBe('column:3'))
  it('centre of 00', () => expect(hit(centre(cell(L, '00')))).toBe('straight:00'))
  it('between 0 and 00 is split:00-0', () => expect(hit(sharedEdge(cell(L, '0'), cell(L, '00')))).toBe('split:00-0'))

  it('portrait/landscape row and column order', () => {
    const c1 = cell(L, '1'), c2 = cell(L, '2'), c4 = cell(L, '4')
    if (o === 'portrait') {
      expect(c2.x).toBeGreaterThan(c1.x)
      expect(c4.y).toBeGreaterThan(c1.y)
      expect(cell(L, '0').y).toBeLessThan(c1.y)
    } else {
      expect(c2.y).toBeLessThan(c1.y)
      expect(c4.x).toBeGreaterThan(c1.x)
      expect(cell(L, '00').y).toBeLessThan(cell(L, '0').y)
    }
  })

  it('double zero bets', () => {
    expect(hit(sharedEdge(cell(L, '0'), cell(L, '1')))).toBe('split:0-1')
    expect(hit(sharedEdge(cell(L, '00'), cell(L, '3')))).toBe('split:00-3')
    expect(hit(sharedEdge(cell(L, '1'), cell(L, '2')), L)).toBe('split:1-2')
  })

  describe('triple', () => {
    const T = make('triple', o)
    it('000/2 boundary point is null', () => expect(hit(sharedEdge(cell(T, '000'), cell(T, '2')), T, 'triple')).toBeNull())
    it('between 0 and 000 is split:000-0', () => expect(hit(sharedEdge(cell(T, '0'), cell(T, '000')), T, 'triple')).toBe('split:000-0'))
    it('zero cell order is 0 / 000 / 00', () => {
      const [a, b, c] = ['0', '000', '00'].map(l => cell(T, l))
      if (o === 'portrait') expect(a.x < b.x && b.x < c.x).toBe(true)
      else expect(a.y > b.y && b.y > c.y).toBe(true)
    })
  })

  describe.each(wheels)('%s wheel anchors', (w) => {
    const W = make(w, o)
    it('anchors cover exactly allBets', () => {
      expect(Object.keys(W.anchors).sort()).toEqual(allBets(w).map(b => b.id).sort())
    })
    it('every anchor hit-tests to its own bet', () => {
      for (const [id, p] of Object.entries(W.anchors)) expect([id, hitTest(W, w, p.x, p.y)]).toEqual([id, id])
    })
  })

  describe('resolveDrop', () => {
    const c17 = centre(cell(L, '17')), c20 = centre(cell(L, '20'))
    it('tray on 17 places', () => expect(resolveDrop(L, 'double', { type: 'tray', amount: 5 }, c17.x, c17.y)).toEqual({ type: 'place', betId: 'straight:17', amount: 5 }))
    it('stack onto 20 moves', () => expect(resolveDrop(L, 'double', { type: 'stack', betId: 'straight:17' }, c20.x, c20.y)).toEqual({ type: 'move', from: 'straight:17', to: 'straight:20' }))
    it('stack off board removes', () => expect(resolveDrop(L, 'double', { type: 'stack', betId: 'straight:17' }, -50, -50)).toEqual({ type: 'remove', betId: 'straight:17' }))
    it('tray off board is none', () => expect(resolveDrop(L, 'double', { type: 'tray', amount: 5 }, -50, -50)).toEqual({ type: 'none' }))
    it('stack on own spot is none', () => expect(resolveDrop(L, 'double', { type: 'stack', betId: 'straight:17' }, c17.x, c17.y)).toEqual({ type: 'none' }))
    it('triple tray on 000/2 boundary is none', () => {
      const T = make('triple', o)
      const p = sharedEdge(cell(T, '000'), cell(T, '2'))
      expect(resolveDrop(T, 'triple', { type: 'tray', amount: 5 }, p.x, p.y)).toEqual({ type: 'none' })
    })
  })
})

describe('single wheel zero area', () => {
  it.each(orientations)('%s baskets and first four', (o) => {
    const L = make('single', o)
    const a = L.anchors
    expect(hitTest(L, 'single', a['basket:0-1-2'].x, a['basket:0-1-2'].y)).toBe('basket:0-1-2')
    expect(hitTest(L, 'single', a['firstFour:0-1-2-3'].x, a['firstFour:0-1-2-3'].y)).toBe('firstFour:0-1-2-3')
    const c1 = cell(L, '1')
    const corner = o === 'portrait' ? { x: c1.x, y: c1.y } : { x: c1.x, y: c1.y + c1.h }
    expect(a['firstFour:0-1-2-3']).toEqual(corner)
  })
})

describe.each(orientations)('%s outward near-misses on the street edge', (o) => {
  // 5px outward from the street edge: left in portrait, down in landscape.
  const out = (p: { x: number; y: number }) => (o === 'portrait' ? { x: p.x - 5, y: p.y } : { x: p.x, y: p.y + 5 })
  const L = make('double', o)
  it('beside row 7-8-9 is still the street', () => {
    const p = out(streetEdge(o, cell(L, '7')))
    expect(hitTest(L, 'double', p.x, p.y)).toBe('street:7-8-9')
  })
  it('at 7|10 is still the six line', () => {
    const p = out(L.anchors['sixline:7-8-9-10-11-12'])
    expect(hitTest(L, 'double', p.x, p.y)).toBe('sixline:7-8-9-10-11-12')
  })
  it('first five (double) and first four (single)', () => {
    const p = out(L.anchors['firstFive:00-0-1-2-3'])
    expect(hitTest(L, 'double', p.x, p.y)).toBe('firstFive:00-0-1-2-3')
    const S = make('single', o)
    const q = out(S.anchors['firstFour:0-1-2-3'])
    expect(hitTest(S, 'single', q.x, q.y)).toBe('firstFour:0-1-2-3')
  })
})

describe.each(orientations)('%s triple zero boundary falls through', (o) => {
  const T = make('triple', o)
  const hit = (p: { x: number; y: number }) => hitTest(T, 'triple', p.x, p.y)
  // A point a fraction `f` of the cell depth inside a number cell (row 1) from the zero boundary.
  const intoNumber = (r: Rect, f: number, along = 0.5) => o === 'portrait'
    ? { x: r.x + along * r.w, y: r.y + f * r.h }
    : { x: r.x + f * r.w, y: r.y + r.h - along * r.h }
  // Same, inside a zero cell measured from the boundary.
  const intoZero = (r: Rect, f: number, along = 0.5) => o === 'portrait'
    ? { x: r.x + along * r.w, y: r.y + r.h - f * r.h }
    : { x: r.x + r.w - f * r.w, y: r.y + r.h - along * r.h }

  it.each(['1', '2', '3'])('15%% into %s is straight', (n) => expect(hit(intoNumber(cell(T, n), 0.15))).toBe(`straight:${n}`))
  it.each(['0', '000', '00'])('15%% into %s is straight', (z) => expect(hit(intoZero(cell(T, z), 0.15))).toBe(`straight:${z}`))
  it('1|2 line near the top of row 1 is split:1-2', () => expect(hit(intoNumber(cell(T, '1'), 0.15, 1))).toBe('split:1-2'))
  it('lower part of zero dividers still splits', () => {
    expect(hit(intoZero(cell(T, '0'), 0.15, 1))).toBe('split:000-0')
    expect(hit(intoZero(cell(T, '000'), 0.15, 1))).toBe('split:000-00')
  })
})
