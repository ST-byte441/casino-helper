import { spotAction, stackTapAction } from '../../features/craps/spots'
import { ActiveBet, BetType } from '../../lib/types'

const bet = (id: string, type: BetType, extra: Partial<ActiveBet> = {}): ActiveBet => ({
  id, type, amount: 10, working: true, ...extra,
})

describe('spotAction', () => {
  it('box:n places on n', () => {
    expect(spotAction('box:6', [], null)).toEqual({ kind: 'place', type: 'place', number: 6 })
    expect(spotAction('box:11', [], 6)).toEqual({ kind: 'place', type: 'place', number: 11 })
  })

  it.each(['pass', 'dont-pass', 'come', 'dont-come', 'field', 'low-field', 'high-field', 'big6', 'big8'] as const)(
    '%s places that type', (k) => {
      expect(spotAction(k, [], null)).toEqual({ kind: 'place', type: k })
    })

  it.each([4, 6, 8, 10] as const)('hard:%i places a hardway on that number', (n) => {
    expect(spotAction(`hard:${n}` as const, [], null)).toEqual({ kind: 'place', type: 'hardway', number: n })
  })

  it.each(['any-7', 'any-craps', 'craps-2', 'craps-3', 'yo-11', 'craps-12', 'ce'] as const)(
    '%s places that type', (k) => {
      expect(spotAction(k, [], null)).toEqual({ kind: 'place', type: k })
    })

  it('horn places horn with 4 units', () => {
    expect(spotAction('horn', [], null)).toEqual({ kind: 'place', type: 'horn', units: 4 })
  })

  it('pass-odds targets the pass bet when a point is on', () => {
    expect(spotAction('pass-odds', [bet('p1', 'pass')], 6)).toEqual({ kind: 'odds', betId: 'p1' })
  })
  it('pass-odds is none without a point or a pass bet', () => {
    expect(spotAction('pass-odds', [bet('p1', 'pass')], null)).toEqual({ kind: 'none' })
    expect(spotAction('pass-odds', [bet('d1', 'dont-pass')], 6)).toEqual({ kind: 'none' })
  })
  it('dont-pass-odds targets the dont-pass bet when a point is on', () => {
    expect(spotAction('dont-pass-odds', [bet('d1', 'dont-pass')], 8)).toEqual({ kind: 'odds', betId: 'd1' })
    expect(spotAction('dont-pass-odds', [bet('d1', 'dont-pass')], null)).toEqual({ kind: 'none' })
    expect(spotAction('dont-pass-odds', [bet('p1', 'pass')], 8)).toEqual({ kind: 'none' })
  })
})

describe('stackTapAction', () => {
  it('come/dont-come with a comePoint gives odds', () => {
    expect(stackTapAction(bet('c1', 'come', { comePoint: 5 }))).toEqual({ kind: 'odds', betId: 'c1' })
    expect(stackTapAction(bet('c2', 'dont-come', { comePoint: 9 }))).toEqual({ kind: 'odds', betId: 'c2' })
  })
  it('come without a comePoint places more come', () => {
    expect(stackTapAction(bet('c1', 'come'))).toEqual({ kind: 'place', type: 'come' })
  })
  it('pass/dont-pass place the type', () => {
    expect(stackTapAction(bet('p', 'pass'))).toEqual({ kind: 'place', type: 'pass' })
    expect(stackTapAction(bet('d', 'dont-pass'))).toEqual({ kind: 'place', type: 'dont-pass' })
  })
  it('horn stack places horn with 4 units', () => {
    expect(stackTapAction(bet('h', 'horn'))).toEqual({ kind: 'place', type: 'horn', units: 4 })
  })
  it('others place more of the same type and number', () => {
    expect(stackTapAction(bet('x', 'place', { number: 8 }))).toEqual({ kind: 'place', type: 'place', number: 8 })
    expect(stackTapAction(bet('y', 'hardway', { number: 6 }))).toEqual({ kind: 'place', type: 'hardway', number: 6 })
    expect(stackTapAction(bet('z', 'field'))).toEqual({ kind: 'place', type: 'field' })
  })
})
