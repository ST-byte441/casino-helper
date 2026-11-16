import {
  fixTarget, maxExactOdds, nearbyExact, payoutCheck, payoutFor, payoutHint,
} from '../../features/craps/assist'
import { isCleanLayOdds, isCleanOdds, isCleanPlace } from '../../features/craps/engine'
import { ActiveBet, BetType } from '../../lib/types'

const bet = (type: BetType, amount: number, extra: Partial<ActiveBet> = {}): ActiveBet =>
  ({ id: 'b', type, amount, working: true, ...extra })
const FREE = { cap: null, free: 1000 }

describe('payoutCheck', () => {
  test('a Place bet is checked on its amount, against the number’s step', () => {
    expect(payoutCheck(bet('place', 15, { number: 6 }), null)).toMatchObject(
      { kind: 'place', number: 6, amount: 15, step: 6, exact: false, ratio: '7 to 6' })
    expect(payoutCheck(bet('place', 18, { number: 8 }), 4)).toMatchObject({ step: 6, exact: true })
    expect(payoutCheck(bet('place', 10, { number: 5 }), null)).toMatchObject({ step: 5, exact: true, ratio: '7 to 5' })
    expect(payoutCheck(bet('place', 12, { number: 4 }), null)).toMatchObject({ step: 5, exact: false, ratio: '9 to 5' })
    expect(payoutCheck(bet('place', 4, { number: 3 }), null)).toMatchObject({ step: 5, exact: false, ratio: '13 to 5' })
    expect(payoutCheck(bet('place', 3, { number: 2 }), null)).toMatchObject({ step: 1, exact: true })
  })

  test('a line bet is checked on its odds, at its own point', () => {
    expect(payoutCheck(bet('pass', 10, { odds: 12 }), 8)).toMatchObject(
      { kind: 'odds', number: 8, amount: 12, step: 5, exact: false, ratio: '6 to 5' })
    expect(payoutCheck(bet('come', 10, { odds: 5, comePoint: 5 }), 8)).toMatchObject(
      { kind: 'odds', number: 5, step: 2, exact: false, ratio: '3 to 2' })
    expect(payoutCheck(bet('pass', 10, { odds: 7 }), 4)).toMatchObject({ step: 1, exact: true, ratio: '2 to 1' })
    expect(payoutCheck(bet('dont-pass', 10, { odds: 20 }), 9)).toMatchObject(
      { kind: 'lay', number: 9, step: 3, exact: false, ratio: '2 to 3' })
    expect(payoutCheck(bet('dont-come', 10, { odds: 4, comePoint: 3 }), 6)).toMatchObject(
      { kind: 'lay', number: 3, step: 3, exact: false, ratio: '1 to 3' })
  })

  test('nothing to check: no odds, no point, or a bet the assist doesn’t size', () => {
    expect(payoutCheck(bet('pass', 10), 6)).toBeNull()
    expect(payoutCheck(bet('pass', 10, { odds: 10 }), null)).toBeNull()
    expect(payoutCheck(bet('come', 10, { odds: 10 }), 6)).toBeNull()
    expect(payoutCheck(bet('field', 15), 6)).toBeNull()
    expect(payoutCheck(bet('buy', 20, { number: 4 }), 6)).toBeNull()
  })
})

describe('what an amount pays (the engine’s own payouts)', () => {
  test('place, odds and lay', () => {
    const place6 = payoutCheck(bet('place', 15, { number: 6 }), null)!
    expect(payoutFor(place6, 15)).toBe(17)
    expect(payoutFor(place6, 18)).toBe(21)
    expect(payoutFor(payoutCheck(bet('pass', 10, { odds: 12 }), 8)!, 15)).toBe(18)
    expect(payoutFor(payoutCheck(bet('dont-pass', 10, { odds: 20 }), 9)!, 21)).toBe(14)
  })
})

describe('nearby exact amounts and the hint', () => {
  test('$15 on the 6: $12 or $18', () => {
    const c = payoutCheck(bet('place', 15, { number: 6 }), null)!
    expect(nearbyExact(c)).toEqual({ below: 12, above: 18 })
    expect(payoutHint(c)).toBe('Place 6 pays 7 to 6: try $12 or $18')
  })

  test('below the first step there is only the one above', () => {
    const c = payoutCheck(bet('place', 5, { number: 8 }), null)!
    expect(nearbyExact(c)).toEqual({ below: null, above: 6 })
    expect(payoutHint(c)).toBe('Place 8 pays 7 to 6: try $6')
  })

  test('odds and lay odds wording', () => {
    expect(payoutHint(payoutCheck(bet('pass', 10, { odds: 12 }), 8)!)).toBe('Odds on 8 pay 6 to 5: try $10 or $15')
    expect(payoutHint(payoutCheck(bet('dont-pass', 10, { odds: 20 }), 9)!)).toBe('Lay odds on 9 pay 2 to 3: try $18 or $21')
  })

  test('no hint when it already pays exactly', () => {
    expect(payoutHint(payoutCheck(bet('place', 18, { number: 6 }), null)!)).toBeNull()
  })
})

describe('fixTarget: the one-tap fix', () => {
  const place15 = payoutCheck(bet('place', 15, { number: 6 }), null)!
  test('rounds up when the balance allows', () => {
    expect(fixTarget(place15, FREE)).toBe(18)
  })
  test('rounds down when it can’t afford going up', () => {
    expect(fixTarget(place15, { cap: null, free: 2 })).toBe(12)
  })
  test('odds round down when going up would pass the cap', () => {
    const odds12 = payoutCheck(bet('pass', 10, { odds: 12 }), 8)!
    expect(fixTarget(odds12, { cap: 25, free: 1000 })).toBe(15)
    expect(fixTarget(odds12, { cap: 12, free: 1000 })).toBe(10)
  })
  test('none when already exact, or when neither way works', () => {
    expect(fixTarget(payoutCheck(bet('place', 18, { number: 6 }), null)!, FREE)).toBeNull()
    expect(fixTarget(payoutCheck(bet('place', 5, { number: 6 }), null)!, { cap: null, free: 0 })).toBeNull()
  })
})

describe('maxExactOdds', () => {
  test('the largest exact amount within the cap and what the balance can add', () => {
    expect(maxExactOdds(5, 50, 12, 1000)).toBe(50)
    expect(maxExactOdds(5, 50, 12, 20)).toBe(30)
    expect(maxExactOdds(6, 45, 0, 1000)).toBe(42)
    expect(maxExactOdds(2, 1, 0, 1000)).toBe(0)
  })
})

describe('the list’s clean checks follow the same steps', () => {
  test('crapless lays round down too, so they need their step', () => {
    expect(isCleanLayOdds(4, 3)).toBe(false)
    expect(isCleanLayOdds(6, 3)).toBe(true)
    expect(isCleanLayOdds(5, 12)).toBe(false)
    expect(isCleanLayOdds(6, 2)).toBe(true)
  })
  test('place and odds unchanged', () => {
    expect(isCleanPlace(18, 6)).toBe(true)
    expect(isCleanPlace(3, 12)).toBe(true)
    expect(isCleanOdds(7, 11)).toBe(true)
    expect(isCleanOdds(5, 9)).toBe(false)
  })
})
