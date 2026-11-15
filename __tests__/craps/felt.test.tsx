import React from 'react'
import { StyleSheet } from 'react-native'
import { render } from '@testing-library/react-native'
import { CrapsFelt } from '../../features/craps/components/table/CrapsFelt'
import { buildCrapsLayout, labelRect, CrapsLayout, Rect } from '../../features/craps/layout'
import { ActiveBet, CrapsVariant } from '../../lib/types'

const bet = (b: Partial<ActiveBet> & Pick<ActiveBet, 'type' | 'id'>): ActiveBet => ({ amount: 5, working: true, ...b })

type Box = { left: number; top: number; width: number; height: number }
const boxOf = (node: { props: { style: unknown } }): Box => StyleSheet.flatten(node.props.style as any) as Box
const centreOf = (b: Box) => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 })
const inside = (p: { x: number; y: number }, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
const rectOf = (L: CrapsLayout, key: string) => L.areas.find(a => a.key === key)!.rect

const draw = (L: CrapsLayout, over: Partial<React.ComponentProps<typeof CrapsFelt>> = {}) =>
  render(<CrapsFelt layout={L} bets={[]} point={null} highlight={null} fieldPays3on12={false} {...over} />)

const variants: CrapsVariant[] = ['craps', 'crapless', 'easy']
const sizes: [number, number][] = [[880, 320], [884, 600]]
const cases = variants.flatMap(v => sizes.map(([w, h]) => [v, w, h] as [CrapsVariant, number, number]))

describe.each(cases)('%s at %dx%d', (variant, width, height) => {
  const L = buildCrapsLayout(variant, width, height)

  it('renders every area of the layout (point set), each at its rect', () => {
    const { getByTestId } = draw(L, { point: 6 })
    for (const a of L.areas) {
      const b = boxOf(getByTestId(`area-${a.key}`))
      expect(b).toMatchObject({ left: a.rect.x, top: a.rect.y, width: a.rect.w, height: a.rect.h })
    }
  })

  it('draws the line and number-box labels in their own label boxes', () => {
    const { getByTestId } = draw(L, { point: 6 })
    for (const key of ['pass', 'dont-pass', 'box:6', 'box:8'] as const) {
      const area = L.areas.find(a => a.key === key)
      if (!area) continue
      const lb = labelRect(L, key)
      expect(boxOf(getByTestId(`label-${key}`))).toMatchObject({
        left: lb.x - area.rect.x, top: lb.y - area.rect.y, width: lb.w, height: lb.h,
      })
    }
  })

  it('puts the ON puck over box:6 when the point is 6', () => {
    const { getByTestId, queryByTestId } = draw(L, { point: 6 })
    expect(queryByTestId('puck-off')).toBeNull()
    const c = centreOf(boxOf(getByTestId('puck-on')))
    expect(c.x).toBeCloseTo(L.boxSlots[6].puck.x)
    expect(c.y).toBeCloseTo(L.boxSlots[6].puck.y)
    expect(inside(c, rectOf(L, 'box:6'))).toBe(true)
  })

  it('shows the OFF puck at offPuck with no point', () => {
    const { getByTestId, queryByTestId } = draw(L)
    expect(queryByTestId('puck-on')).toBeNull()
    const c = centreOf(boxOf(getByTestId('puck-off')))
    expect(c.x).toBeCloseTo(L.offPuck.x)
    expect(c.y).toBeCloseTo(L.offPuck.y)
  })

  it('hides the odds areas with no point', () => {
    const { queryByTestId } = draw(L)
    expect(queryByTestId('area-pass-odds')).toBeNull()
    expect(queryByTestId('area-dont-pass-odds')).toBeNull()
    expect(queryByTestId('area-pass')).not.toBeNull()
  })

  it('draws a come bet on 8 inside box:8', () => {
    const { getByTestId } = draw(L, { point: 6, bets: [bet({ id: 'c1', type: 'come', comePoint: 8, odds: 10 })] })
    const box8 = rectOf(L, 'box:8')
    expect(inside(centreOf(boxOf(getByTestId('stack-c1'))), box8)).toBe(true)
    expect(inside(centreOf(boxOf(getByTestId('stack-c1-odds'))), box8)).toBe(true)
  })

  it('draws pass odds at the pass-odds anchor once a point is set', () => {
    const { getByTestId } = draw(L, { point: 6, bets: [bet({ id: 'p1', type: 'pass', odds: 10 })] })
    const c = centreOf(boxOf(getByTestId('stack-p1-odds')))
    expect(c.x).toBeCloseTo(L.anchors['pass-odds'].x)
    expect(c.y).toBeCloseTo(L.anchors['pass-odds'].y)
    expect(inside(centreOf(boxOf(getByTestId('stack-p1'))), rectOf(L, 'pass'))).toBe(true)
  })

  it('keeps every stack centre inside the felt', () => {
    const bets = [
      bet({ id: 'a', type: 'place', number: 4 }), bet({ id: 'b', type: 'come', comePoint: 4, odds: 5 }),
      bet({ id: 'd', type: 'hop-hard', hopDice: [3, 3] }), bet({ id: 'e', type: 'hi-lo' }),
    ]
    const { getByTestId } = draw(L, { point: 5, bets })
    for (const b of bets) {
      const c = centreOf(boxOf(getByTestId(`stack-${b.id}`)))
      expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x).toBeLessThanOrEqual(width)
      expect(c.y).toBeGreaterThanOrEqual(0); expect(c.y).toBeLessThanOrEqual(height)
    }
    // More-bets bets fan out instead of sitting on one another.
    expect(centreOf(boxOf(getByTestId('stack-d')))).not.toEqual(centreOf(boxOf(getByTestId('stack-e'))))
  })

  const props = L.areas.filter(a => a.tone === 'prop')
  const inStrip = (id: string, r: ReturnType<typeof draw>) => {
    const b = boxOf(r.getByTestId(id))
    const c = centreOf(b)
    expect([id, inside(c, L.moreRect)]).toEqual([id, true])
    // The whole chip stays in the strip, so it never covers a props cell or COME / FIELD.
    expect([id, b.left >= L.moreRect.x - 1e-6, b.left + b.width <= L.moreRect.x + L.moreRect.w + 1e-6,
      b.top >= L.moreRect.y - 1e-6, b.top + b.height <= L.moreRect.y + L.moreRect.h + 1e-6]).toEqual([id, true, true, true, true])
    for (const a of props) expect([id, a.key, inside(c, a.rect)]).toEqual([id, a.key, false])
  }

  it('draws World, Hi-Lo and hops in the More bets strip, tagged', () => {
    const bets = [bet({ id: 'w', type: 'world' }), bet({ id: 'h', type: 'hi-lo' }),
      bet({ id: 'e', type: 'hop-easy', hopDice: [2, 5] }), bet({ id: 'x', type: 'hop-hard', hopDice: [3, 3] })]
    const r = draw(L, { point: 6, bets })
    for (const b of bets) inStrip(`stack-${b.id}`, r)
    expect(r.getByTestId('stack-w')).toHaveTextContent(/WORLD/)
    expect(r.getByTestId('stack-h')).toHaveTextContent(/HI-LO/)
    expect(r.getByTestId('stack-e')).toHaveTextContent(/2-5/)
    expect(r.getByTestId('stack-x')).toHaveTextContent(/3-3/)
    expect(r.queryByTestId('more-bets-overflow')).toBeNull()
  })

  it('caps a long row of hops inside the strip with a +N count', () => {
    const hops: ActiveBet[] = []
    for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++)
      hops.push(bet({ id: `hop${a}${b}`, type: a === b ? 'hop-hard' : 'hop-easy', hopDice: [a, b] }))
    const r = draw(L, { bets: hops })
    const drawn = hops.filter(h => r.queryByTestId(`stack-${h.id}`))
    expect(drawn.length).toBeGreaterThan(0)
    expect(drawn.length).toBeLessThan(hops.length)
    for (const h of drawn) inStrip(`stack-${h.id}`, r)
    inStrip('more-bets-overflow', r)
    expect(r.getByTestId('more-bets-overflow')).toHaveTextContent(`+${hops.length - drawn.length}`)
  })
})

describe('CrapsFelt labels and tints', () => {
  const L = buildCrapsLayout('craps', 880, 320)

  it('labels the Field 12 PAYS TRIPLE or DOUBLE per the rule', () => {
    expect(draw(L, { fieldPays3on12: true }).getByText('12 PAYS TRIPLE')).toBeTruthy()
    const dbl = draw(L, { fieldPays3on12: false })
    expect(dbl.getByText('12 PAYS DOUBLE')).toBeTruthy()
    expect(dbl.queryByText('12 PAYS TRIPLE')).toBeNull()
    expect(dbl.getByText('2 · 3 · 4 · 9 · 10 · 11 · 12')).toBeTruthy()
  })

  it('shows the felt labels', () => {
    const { getByText } = draw(L, { point: 6 })
    for (const t of ['PASS LINE', "DON'T PASS BAR 12", 'COME', "DON'T COME", 'BIG 6', 'BIG 8', 'SIX', 'NINE', '4',
      'SEVEN', 'HARD 4', 'ANY CRAPS', 'C&E', 'HORN']) expect(getByText(t)).toBeTruthy()
  })

  it('tags buy and lay stacks', () => {
    const { getByTestId } = draw(L, { bets: [bet({ id: 'b', type: 'buy', number: 4, amount: 20 }), bet({ id: 'l', type: 'lay', number: 10, amount: 40 })] })
    expect(getByTestId('stack-b')).toHaveTextContent(/BUY/)
    expect(getByTestId('stack-l')).toHaveTextContent(/LAY/)
  })

  it('tints an area border by quality, and lights the highlight', () => {
    const { getByTestId } = draw(L, { highlight: 'field', quality: k => (k === 'pass' ? 'optimal' : k === 'horn' ? 'avoid' : null) })
    expect(boxOf(getByTestId('area-pass')) as any).toMatchObject({ borderColor: '#FFD700' })
    expect(boxOf(getByTestId('area-horn')) as any).toMatchObject({ borderColor: '#e74c3c' })
    expect((boxOf(getByTestId('area-field')) as any).backgroundColor).toMatch(/rgba\(255, ?215, ?0/)
  })
})
