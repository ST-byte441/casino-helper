import { buildCrapsLayout, fit, hitCraps, labelRect, oddsSizeFor, puckSizeFor, stackSizeFor, slotFor, tableFeltSize, CrapsLayout, SpotKey } from '../../features/craps/layout'
import { feltStacks } from '../../features/craps/components/table/CrapsFelt'
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
// Large screens (Fold inner, landscape and portrait) with the large chrome.
const LARGE_SCREENS: [number, number][] = [[884, 673], [673, 884]]
const TABLE_FELTS = TABLE_SCREENS.map(([w, h]) => { const f = tableFeltSize(w, h); return [f.width, f.height] as [number, number] })
const LARGE_FELTS = LARGE_SCREENS.map(([w, h]) => { const f = tableFeltSize(w, h, 'large'); return [f.width, f.height] as [number, number] })
// Bigger tablet felts too, where the boxes are roomy.
const ROOMY_FELTS: [number, number][] = [[1100, 500], [1700, 760]]
const sizes: [number, number][] = [...TABLE_FELTS, ...LARGE_FELTS, ...ROOMY_FELTS, [880, 320], [832, 360], [884, 600], [673, 420]]
const cases = variants.flatMap(v => sizes.map(([w, h]) => [v, w, h] as [CrapsVariant, number, number]))

const centre = (r: R) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
const inside = (p: { x: number; y: number }, r: R) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
const overlap = (a: R, b: R) => {
  const eps = 1e-6
  return a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.y < b.y + b.h - eps && b.y < a.y + a.h - eps
}
const bet = (b: Partial<ActiveBet> & Pick<ActiveBet, 'type'>): ActiveBet => ({ id: 'b', amount: 5, working: true, ...b })
const within = (a: R, b: R) => a.x >= b.x - 1e-6 && a.y >= b.y - 1e-6 && a.x + a.w <= b.x + b.w + 1e-6 && a.y + a.h <= b.y + b.h + 1e-6
/** A circle of radius r at c against a rect: true when they share any point beyond a hair. */
const circleHits = (c: { x: number; y: number }, r: number, b: R) => {
  const dx = c.x - Math.min(Math.max(c.x, b.x), b.x + b.w)
  const dy = c.y - Math.min(Math.max(c.y, b.y), b.y + b.h)
  return Math.hypot(dx, dy) < r - 1e-6
}

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

  it('dice + ROLL sit at the right end of the Pass Line band, the Pass Line ending where they start', () => {
    const d = L.diceRect
    const pass = L.areas.find(a => a.key === 'pass')!.rect
    expect(d.y).toBeCloseTo(pass.y)
    expect(d.h).toBeCloseTo(pass.h)
    expect(d.x + d.w).toBeCloseTo(width)
    expect(pass.x).toBe(0)
    expect(pass.x + pass.w).toBeCloseTo(d.x)
    // Room for the dice beside a ROLL button with a 44dp touch target.
    expect(d.h).toBeGreaterThanOrEqual(56)
    expect(d.w).toBeGreaterThanOrEqual(150)
  })

  it('the props box runs to the felt\'s right edge; the number boxes and middle bands end where it starts', () => {
    const props = L.areas.filter(a => a.tone === 'prop')
    const propsX = Math.min(...props.map(a => a.rect.x))
    expect(Math.max(...props.map(a => a.rect.x + a.rect.w))).toBeCloseTo(width)
    const boxes = L.areas.filter(a => a.tone === 'box')
    expect(Math.max(...boxes.map(a => a.rect.x + a.rect.w))).toBeCloseTo(propsX)
    for (const a of L.areas.filter(a => ['come', 'dont-pass', variant === 'easy' ? 'high-field' : 'field'].includes(a.key)))
      expect([a.key, a.rect.x + a.rect.w]).toEqual([a.key, expect.closeTo(propsX, 5)])
    expect(L.moreRect.x + L.moreRect.w).toBeCloseTo(width)
  })

  it('the line labels sit left of centre with their odds area to the right, never under the label', () => {
    const lines: [SpotKey, SpotKey][] = [['pass', 'pass-odds'], ['dont-pass', 'dont-pass-odds']]
    for (const [line, odds] of lines) {
      const area = L.areas.find(a => a.key === line)
      const oddsArea = L.areas.find(a => a.key === odds)
      if (!area || !oddsArea) continue
      const label = labelRect(L, line)
      expect([line, within(label, area.rect)]).toEqual([line, true])
      expect([line, label.w >= 32, label.h >= 20]).toEqual([line, true, true])
      expect(centre(label).x).toBeLessThan(centre(area.rect).x)
      expect([odds, overlap(oddsArea.rect, label)]).toEqual([odds, false])
      expect(oddsArea.rect.x).toBeGreaterThanOrEqual(label.x + label.w)
      // The drawn stacks: the flat bet and its odds stay off the label.
      const flat = bet({ id: line, type: line as ActiveBet['type'], odds: 10 })
      for (const s of feltStacks(L, [flat], 6))
        expect([s.key, circleHits(s.at, s.size / 2, label)]).toEqual([s.key, false])
    }
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

  it('the ON puck sits in each box\'s top-right corner, clear of the box label and the other slots', () => {
    const r = puckSizeFor(L) / 2
    const stackR = stackSizeFor(L) / 2
    const hasDC = L.areas.some(a => a.key === 'dont-come')
    for (const a of L.areas.filter(a => a.tone === 'box')) {
      const s = L.boxSlots[Number(a.key.slice(4))]
      const p = s.puck
      // Inside the box, whole circle.
      expect([a.key, p.x - r >= a.rect.x, p.x + r <= a.rect.x + a.rect.w, p.y - r >= a.rect.y, p.y + r <= a.rect.y + a.rect.h])
        .toEqual([a.key, true, true, true, true])
      expect([a.key, p.x > centre(a.rect).x, p.y < centre(a.rect).y]).toEqual([a.key, true, true])
      const label = labelRect(L, a.key)
      expect([a.key, within(label, a.rect)]).toEqual([a.key, true])
      expect([a.key, circleHits(p, r, label)]).toEqual([a.key, false])
      const others: [string, { x: number; y: number }][] = [['come', s.come], ['lay', s.lay], ['place', s.place]]
      if (hasDC) others.push(['dontCome', s.dontCome])
      for (const [name, q] of others)
        expect([a.key, name, Math.hypot(q.x - p.x, q.y - p.y) >= r + stackR - 1e-6]).toEqual([a.key, name, true])
      expect([a.key, Math.hypot(s.dontCome.x - p.x, s.dontCome.y - p.y) > r]).toEqual([a.key, true])
    }
  })

  it('no chip slot or puck enters a box number\'s text, and the number stays readable', () => {
    const r = puckSizeFor(L) / 2
    const stackR = stackSizeFor(L) / 2
    const hasDC = L.areas.some(a => a.key === 'dont-come')
    const hasCome = L.areas.some(a => a.key === 'come')
    for (const a of L.areas.filter(a => a.tone === 'box')) {
      const n = Number(a.key.slice(4))
      const t = L.boxLabels[n]
      // The text box is what the felt draws: ~0.62em per bold caps char, 1.2em tall, inside the label box.
      expect([a.key, within(t.box, labelRect(L, a.key)), within(t.box, a.rect)]).toEqual([a.key, true, true])
      expect(t.box.w).toBeCloseTo(t.text.length * 0.62 * t.fontSize)
      expect(t.box.h).toBeCloseTo(t.fontSize * 1.2)
      expect([a.key, t.fontSize >= 14]).toEqual([a.key, true])
      expect([String(n), n === 6 ? 'SIX' : n === 9 ? 'NINE' : String(n)]).toContain(t.text)
      const s = L.boxSlots[n]
      const circles: [string, { x: number; y: number }, number][] = [
        ['puck', s.puck, r], ['place', s.place, stackR], ['come', s.come, stackR], ['lay', s.lay, stackR],
        ['dontCome', s.dontCome, stackR],
      ]
      for (const [name, c, rad] of circles) expect([a.key, name, circleHits(c, rad, t.box)]).toEqual([a.key, name, false])
      // Come / Don't Come bets that travelled here, with odds: every drawn stack misses the number too.
      const travelled: ActiveBet[] = []
      if (hasCome) travelled.push(bet({ id: 'c', type: 'come', comePoint: n, odds: 10 }))
      if (hasDC) travelled.push(bet({ id: 'd', type: 'dont-come', comePoint: n, odds: 10 }))
      travelled.push(bet({ id: 'p', type: 'place', number: n }))
      for (const st of feltStacks(L, travelled, null))
        expect([a.key, st.key, circleHits(st.at, st.size / 2, t.box)]).toEqual([a.key, st.key, false])
    }
  })

  it('no two chip slots (with their odds) or the puck overlap in a box, each inside the box, off the number', () => {
    const stackR = stackSizeFor(L) / 2
    const oddsR = oddsSizeFor(stackSizeFor(L)) / 2
    // Odds chips stay big enough to read their amount.
    expect(oddsSizeFor(stackSizeFor(L))).toBeGreaterThanOrEqual(20)
    const puckR = puckSizeFor(L) / 2
    const hasDC = L.areas.some(a => a.key === 'dont-come')
    const hasCome = L.areas.some(a => a.key === 'come')
    const hasLay = variant !== 'easy'
    // Readable amounts: never below 22dp.
    expect(stackSizeFor(L)).toBeGreaterThanOrEqual(22)
    for (const a of L.areas.filter(a => a.tone === 'box')) {
      const n = Number(a.key.slice(4))
      const s = L.boxSlots[n]
      // Only the slots this game can fill (no Don't Come outside craps; no come or lay on the easy table).
      const circles: [string, { x: number; y: number }, number][] = [['puck', s.puck, puckR], ['place', s.place, stackR]]
      if (hasCome) circles.push(['come', s.come, stackR], ['comeOdds', s.comeOdds, oddsR])
      if (hasLay) circles.push(['lay', s.lay, stackR])
      if (hasDC) circles.push(['dontCome', s.dontCome, stackR], ['dontComeOdds', s.dontComeOdds, oddsR])
      for (const [name, c, r] of circles) {
        expect([a.key, name, c.x - r >= a.rect.x - 1e-6, c.x + r <= a.rect.x + a.rect.w + 1e-6,
          c.y - r >= a.rect.y - 1e-6, c.y + r <= a.rect.y + a.rect.h + 1e-6]).toEqual([a.key, name, true, true, true, true])
        expect([a.key, name, circleHits(c, r, L.boxLabels[n].box)]).toEqual([a.key, name, false])
      }
      for (let i = 0; i < circles.length; i++)
        for (let j = i + 1; j < circles.length; j++) {
          const [na, ca, ra] = circles[i], [nb, cb, rb] = circles[j]
          // Touching is fine (1dp of slack); overlapping hides an amount.
          expect([a.key, na, nb, Math.hypot(ca.x - cb.x, ca.y - cb.y) >= ra + rb - 1]).toEqual([a.key, na, nb, true])
        }
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

  it('the More bets strip sits under the props cells, clear of every area and the dice, at least 32x32', () => {
    const m = L.moreRect
    expect(m.w >= 32 && m.h >= 32).toBe(true)
    expect(m.x >= 0 && m.y >= 0 && m.x + m.w <= width + 1e-6 && m.y + m.h <= height + 1e-6).toBe(true)
    for (const a of L.areas) expect([a.key, overlap(a.rect, m)]).toEqual([a.key, false])
    expect(overlap(L.diceRect, m)).toBe(false)
    const props = L.areas.filter(a => a.tone === 'prop')
    expect(m.x).toBeCloseTo(Math.min(...props.map(a => a.rect.x)))
    for (const a of props) expect(a.rect.y + a.rect.h).toBeLessThanOrEqual(m.y + 1e-6)
  })

  it('slotFor puts World, Hi-Lo and hops in the More bets strip', () => {
    for (const b of [bet({ type: 'world' }), bet({ type: 'hi-lo' }), bet({ type: 'hop-easy', hopDice: [2, 5] })]) {
      expect([b.type, inside(slotFor(L, b), L.moreRect)]).toEqual([b.type, true])
    }
  })

  it('a point outside the felt gives null', () => {
    expect(hitCraps(L, -5, -5)).toBeNull()
    expect(hitCraps(L, width + 10, height / 2)).toBeNull()
    expect(hitCraps(L, width / 2, height + 10)).toBeNull()
  })
})

describe('box numbers on large felts', () => {
  // The font a number ("10", the widest) would get in the band left between a top row (puck) and one bottom row
  // of stacks: the arrangement a roomy box can afford. The packer aims for 3/4 of it; the floor here is 0.65, which
  // the narrowest large box (crapless on the large-portrait felt, 53dp wide, place raised between come and lay)
  // just clears. Before this round craps 801x629 had 20.5pt of 40 (0.51).
  const bandFont = (L: CrapsLayout, chars: number) => {
    const box = L.areas.find(a => a.tone === 'box')!.rect
    const s = stackSizeFor(L), top = Math.max(s, puckSizeFor(L)) + 4, bottom = s + 4
    const h = box.h - top - bottom
    return h > 0 ? fit(chars, box.w - 4, h, 0.8) : 0
  }
  test.each(variants.flatMap(v => [...LARGE_FELTS, ...ROOMY_FELTS].map(([w, h]) => [v, w, h] as [CrapsVariant, number, number])))(
    '%s at %dx%d: the number keeps at least 0.65 of its band font', (variant, w, h) => {
      const L = buildCrapsLayout(variant, w, h)
      const font = Math.min(...Object.values(L.boxLabels).map(t => t.fontSize))
      expect(font).toBeGreaterThanOrEqual(0.65 * bandFont(L, 2))
    })
})

describe('tiny felts', () => {
  test.each(variants)('%s at 400x180 builds without throwing, every slot inside its box', variant => {
    const L = buildCrapsLayout(variant, 400, 180)
    for (const a of L.areas.filter(a => a.tone === 'box')) {
      const s = L.boxSlots[Number(a.key.slice(4))]
      for (const p of [s.place, s.come, s.lay, s.dontCome, s.puck, s.comeOdds, s.dontComeOdds])
        expect([a.key, inside(p, a.rect)]).toEqual([a.key, true])
    }
  })
})

describe('box stacks on the Fold cover felt', () => {
  test.each(variants)('%s: Place 6, a travelled Come 6 with odds and a Lay 6 draw without overlapping', variant => {
    const L = buildCrapsLayout(variant, 812, 284)
    const bets: ActiveBet[] = [bet({ id: 'p', type: 'place', number: 6 })]
    if (variant !== 'easy') bets.push(bet({ id: 'c', type: 'come', comePoint: 6, odds: 10 }), bet({ id: 'l', type: 'lay', number: 6, amount: 40 }))
    if (variant === 'craps') bets.push(bet({ id: 'd', type: 'dont-come', comePoint: 6, odds: 10 }))
    const drawn = feltStacks(L, bets, 6)
    expect(drawn.length).toBe(bets.length + bets.filter(b => b.odds).length)
    const puck = { key: 'puck', at: L.boxSlots[6].puck, size: puckSizeFor(L) }
    const all = [...drawn, puck]
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const d = Math.hypot(all[i].at.x - all[j].at.x, all[i].at.y - all[j].at.y)
        expect([all[i].key, all[j].key, d >= (all[i].size + all[j].size) / 2 - 1]).toEqual([all[i].key, all[j].key, true])
      }
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

describe('tableFeltSize', () => {
  test('regular: the tray column and slim header come off the screen', () => {
    expect(tableFeltSize(832, 384)).toEqual({ width: 832 - 60 - 8, height: 384 - 28 - 8 })
  })
  test('large landscape: a wider tray column (55dp chips) and a taller header', () => {
    expect(tableFeltSize(884, 673, 'large')).toEqual({ width: 884 - 75 - 8, height: 673 - 36 - 8 })
  })
  test('large portrait: the felt at full width, landscape-shaped, with room below for the reason line and tray', () => {
    const f = tableFeltSize(673, 884, 'large')
    expect(f.width).toBe(673 - 8)
    expect(f.height).toBeCloseTo((673 - 8) * 0.625)
    expect(36 + 8 + f.height + 32 + 76).toBeLessThanOrEqual(884)
  })
})
