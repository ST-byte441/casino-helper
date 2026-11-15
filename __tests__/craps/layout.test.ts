import { buildCrapsLayout, hitCraps, slotFor, tableFeltSize, CrapsLayout, SpotKey } from '../../features/craps/layout'
import { ActiveBet, CrapsVariant } from '../../lib/types'

type R = { x: number; y: number; w: number; h: number }

const PROPS: SpotKey[] = ['any-7', 'hard:4', 'hard:6', 'hard:8', 'hard:10', 'craps-2', 'craps-3', 'yo-11', 'craps-12', 'any-craps', 'ce', 'horn']
const STD_BOXES: SpotKey[] = ['box:4', 'box:5', 'box:6', 'box:8', 'box:9', 'box:10']
const WIDE_BOXES: SpotKey[] = ['box:2', 'box:3', ...STD_BOXES, 'box:11', 'box:12']

const EXPECTED: Record<CrapsVariant, SpotKey[]> = {
  craps: ['pass', 'pass-odds', 'dont-pass', 'dont-pass-odds', 'come', 'dont-come', 'field', 'big6', 'big8', ...STD_BOXES, ...PROPS],
  crapless: ['pass', 'pass-odds', 'come', 'field', 'big6', 'big8', ...WIDE_BOXES, ...PROPS],
  easy: ['pass', 'pass-odds', 'low-field', 'field', 'high-field', ...WIDE_BOXES, ...PROPS],
}

const variants: CrapsVariant[] = ['craps', 'crapless', 'easy']
// The felts the table view actually produces on a phone in landscape (832x384) and the Fold cover (880x320),
// plus the raw minimum felt, a large landscape and a large portrait felt.
const TABLE_SCREENS: [number, number][] = [[832, 384], [880, 320]]
const TABLE_FELTS = TABLE_SCREENS.map(([w, h]) => { const f = tableFeltSize(w, h); return [f.width, f.height] as [number, number] })
const sizes: [number, number][] = [...TABLE_FELTS, [880, 320], [832, 360], [884, 600], [673, 420]]
const cases = variants.flatMap(v => sizes.map(([w, h]) => [v, w, h] as [CrapsVariant, number, number]))

const centre = (r: R) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
const inside = (p: { x: number; y: number }, r: R) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
const overlap = (a: R, b: R) => {
  const eps = 1e-6
  return a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.y < b.y + b.h - eps && b.y < a.y + a.h - eps
}
const bet = (b: Partial<ActiveBet> & Pick<ActiveBet, 'type'>): ActiveBet => ({ id: 'b', amount: 5, working: true, ...b })

describe.each(cases)('%s at %dx%d', (variant, width, height) => {
  let L: CrapsLayout
  beforeAll(() => { L = buildCrapsLayout(variant, width, height) })

  it('has exactly the expected areas', () => {
    expect(L.areas.map(a => a.key).sort()).toEqual([...EXPECTED[variant]].sort())
    expect(L.width).toBe(width)
    expect(L.height).toBe(height)
  })

  it('no two non-odds areas overlap', () => {
    const solid = L.areas.filter(a => a.tone !== 'odds')
    for (let i = 0; i < solid.length; i++)
      for (let j = i + 1; j < solid.length; j++)
        expect([solid[i].key, solid[j].key, overlap(solid[i].rect, solid[j].rect)]).toEqual([solid[i].key, solid[j].key, false])
  })

  it('every area is at least 32x32 and inside the bounds', () => {
    for (const a of L.areas) {
      expect([a.key, a.rect.w >= 32, a.rect.h >= 32]).toEqual([a.key, true, true])
      expect([a.key, a.rect.x >= 0, a.rect.y >= 0, a.rect.x + a.rect.w <= width + 1e-6, a.rect.y + a.rect.h <= height + 1e-6])
        .toEqual([a.key, true, true, true, true])
    }
  })

  it('dice rect is inside the bounds and clear of every area', () => {
    const d = L.diceRect
    expect(d.x >= 0 && d.y >= 0 && d.x + d.w <= width + 1e-6 && d.y + d.h <= height + 1e-6).toBe(true)
    for (const a of L.areas) expect([a.key, overlap(a.rect, d)]).toEqual([a.key, false])
  })

  it('hitCraps at each area centre returns its key', () => {
    for (const a of L.areas) {
      const c = centre(a.rect)
      expect([a.key, hitCraps(L, c.x, c.y)]).toEqual([a.key, a.key])
    }
  })

  it('anchors sit inside their areas', () => {
    for (const a of L.areas) expect([a.key, inside(L.anchors[a.key], a.rect)]).toEqual([a.key, true])
  })

  it('box slots sit inside their boxes', () => {
    for (const a of L.areas.filter(a => a.tone === 'box')) {
      const n = Number(a.key.slice(4))
      const s = L.boxSlots[n]
      for (const p of [s.place, s.come, s.dontCome, s.lay, s.puck]) expect([a.key, inside(p, a.rect)]).toEqual([a.key, true])
    }
  })

  it('off puck is on the felt (in Don\'t Come when there is one)', () => {
    expect(inside(L.offPuck, { x: 0, y: 0, w: width, h: height })).toBe(true)
    const dc = L.areas.find(a => a.key === 'dont-come')
    if (dc) expect(inside(L.offPuck, dc.rect)).toBe(true)
  })

  it('slotFor puts a come bet on point 8 inside box:8', () => {
    const box8 = L.areas.find(a => a.key === 'box:8')!.rect
    const p = slotFor(L, bet({ type: 'come', comePoint: 8 }))
    expect(inside(p, box8)).toBe(true)
    expect(p).toEqual(L.boxSlots[8].come)
  })

  it('slotFor sends place/buy to the place slot, lay to the lay slot, others to the anchor', () => {
    expect(slotFor(L, bet({ type: 'place', number: 6 }))).toEqual(L.boxSlots[6].place)
    expect(slotFor(L, bet({ type: 'buy', number: 10 }))).toEqual(L.boxSlots[10].place)
    expect(slotFor(L, bet({ type: 'lay', number: 4 }))).toEqual(L.boxSlots[4].lay)
    expect(slotFor(L, bet({ type: 'dont-come', comePoint: 5 }))).toEqual(L.boxSlots[5].dontCome)
    expect(slotFor(L, bet({ type: 'pass' }))).toEqual(L.anchors.pass)
    expect(slotFor(L, bet({ type: 'hardway', number: 8 }))).toEqual(L.anchors['hard:8'])
    expect(slotFor(L, bet({ type: 'field' }))).toEqual(L.anchors.field)
  })

  it('a point outside the felt gives null', () => {
    expect(hitCraps(L, -5, -5)).toBeNull()
    expect(hitCraps(L, width + 10, height / 2)).toBeNull()
    expect(hitCraps(L, width / 2, height + 10)).toBeNull()
  })
})

describe('table felt sizes', () => {
  test('the table chrome leaves 764x348 on 832x384 and 812x284 on 880x320', () => {
    expect(TABLE_FELTS).toEqual([[764, 348], [812, 284]])
  })

  test.each(variants.flatMap(v => TABLE_FELTS.map(([w, h]) => [v, w, h] as [CrapsVariant, number, number])))(
    'every %s area is at least 32x32 on the %dx%d table felt', (variant, w, h) => {
      const L = buildCrapsLayout(variant, w, h)
      for (const a of L.areas) expect([a.key, a.rect.w >= 32, a.rect.h >= 32]).toEqual([a.key, true, true])
    })

  test('the props box has at most 5 rows, the four Hardways in one', () => {
    const L = buildCrapsLayout('craps', 812, 284)
    const props = L.areas.filter(a => a.tone === 'prop')
    expect(new Set(props.map(a => Math.round(a.rect.y))).size).toBeLessThanOrEqual(5)
    const hard = props.filter(a => a.key.startsWith('hard:'))
    expect(new Set(hard.map(a => a.rect.y)).size).toBe(1)
  })
})
