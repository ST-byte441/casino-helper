/**
 * Engine rules pinned to assets/rules-docs/craps-rules.md (sourced from the Venetian, Hard Rock,
 * Riverwind, Wikipedia, and for crapless the NGCB rules of play).
 */
import {
  calculatePayout, resolveRoll, getMaxOdds, getMaxLayOdds, isValidBetForPhase, suggestedBetIncrement,
  isCleanOdds, isCleanLayOdds, isCleanPlace, minBuyLayAmount,
} from '../../features/craps/engine'
import { getBetQuality } from '../../features/craps/strategy'
import { ActiveBet, CrapsTableRules } from '../../lib/types'

const STANDARD: CrapsTableRules = { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false }
const CRAPLESS: CrapsTableRules = { ...STANDARD, variant: 'crapless' }
const bet = (type: ActiveBet['type'], overrides: Partial<ActiveBet> = {}): ActiveBet =>
  ({ id: 'x', type, amount: 10, working: true, ...overrides })
const only = (dice: [number, number], phase: 'come-out' | 'point', point: number | null, b: ActiveBet, rules = STANDARD) =>
  resolveRoll(dice, phase, point, [b], rules).outcomes[0]

describe('C&E: half on any craps (7 to 1), half on 11 (15 to 1)', () => {
  test('2, 3 or 12 nets 3 to 1 on the whole bet', () => {
    expect(calculatePayout(bet('ce', { amount: 2 }), [1, 2], null, STANDARD)).toBe(6)
    expect(calculatePayout(bet('ce', { amount: 10 }), [1, 1], null, STANDARD)).toBe(30)
    expect(calculatePayout(bet('ce', { amount: 10 }), [6, 6], null, STANDARD)).toBe(30)
  })
  test('11 nets 7 to 1 on the whole bet', () => {
    expect(calculatePayout(bet('ce', { amount: 2 }), [5, 6], null, STANDARD)).toBe(14)
  })
  test('anything else loses the whole bet', () => {
    expect(calculatePayout(bet('ce', { amount: 2 }), [3, 4], null, STANDARD)).toBe(-2)
  })
})

describe('Lay vig is 5% of the win, rounded down, min $1, taken on a win', () => {
  test('$40 lay on 4 wins $20 less a $1 vig', () => {
    expect(only([3, 4], 'point', 9, bet('lay', { amount: 40, number: 4 })).delta).toBe(19)
  })
  test('$30 lay on 6 wins $25 less a $1 vig', () => {
    expect(only([3, 4], 'point', 9, bet('lay', { amount: 30, number: 6 })).delta).toBe(24)
  })
  test('a small lay still pays at least the $1 minimum vig', () => {
    expect(only([3, 4], 'point', 9, bet('lay', { amount: 10, number: 4 })).delta).toBe(4)
  })
})

describe('Buy vig is 5% of the bet, rounded down, min $1, taken on a win', () => {
  test('a winning $25 buy on the 10 pays $49', () => {
    expect(only([5, 5], 'point', 9, bet('buy', { amount: 25, number: 10 })).delta).toBe(49)
  })
  test('a $10 buy on 4 still pays the $1 minimum vig', () => {
    expect(only([2, 2], 'point', 9, bet('buy', { amount: 10, number: 4 })).delta).toBe(19)
  })
})

describe('Crapless odds pay 6 to 1 on 2/12 and 3 to 1 on 3/11 (NGCB)', () => {
  test('pass odds on a point of 2 pay 6 to 1', () => {
    const o = only([1, 1], 'point', 2, bet('pass', { amount: 10, odds: 10 }), CRAPLESS)
    expect(o.delta).toBe(10 + 60)
  })
  test('pass odds on a point of 11 pay 3 to 1', () => {
    const o = only([5, 6], 'point', 11, bet('pass', { amount: 10, odds: 20 }), CRAPLESS)
    expect(o.delta).toBe(10 + 60)
  })
  test('come odds on a come point of 12 pay 6 to 1', () => {
    const o = only([6, 6], 'point', 6, bet('come', { amount: 10, odds: 10, comePoint: 12 }), CRAPLESS)
    expect(o.delta).toBe(10 + 60)
  })
})

describe('Crapless place 2/12 pays 25 to 5, 3/11 pays 13 to 5, in $5 units (NGCB)', () => {
  test('$5 on 2 wins $25; $5 on 3 wins $13', () => {
    expect(only([1, 1], 'point', 6, bet('place', { amount: 5, number: 2 }), CRAPLESS).delta).toBe(25)
    expect(only([1, 2], 'point', 6, bet('place', { amount: 5, number: 3 }), CRAPLESS).delta).toBe(13)
  })
  test('$10 on 12 wins $50; $10 on 11 wins $26', () => {
    expect(only([6, 6], 'point', 6, bet('place', { amount: 10, number: 12 }), CRAPLESS).delta).toBe(50)
    expect(only([5, 6], 'point', 6, bet('place', { amount: 10, number: 11 }), CRAPLESS).delta).toBe(26)
  })
  test('the suggested increment on 2, 3, 11, 12 is $5', () => {
    for (const n of [2, 3, 11, 12]) expect(suggestedBetIncrement('place', n)).toBe(5)
  })
})

describe('Lay on 2/12 pays 1 to 6 and on 3/11 pays 1 to 3', () => {
  test('$60 lay on 2 wins $10 less $1 vig', () => {
    expect(only([3, 4], 'point', 6, bet('lay', { amount: 60, number: 2 }), CRAPLESS).delta).toBe(9)
  })
  test('$30 lay on 11 wins $10 less $1 vig', () => {
    expect(only([3, 4], 'point', 6, bet('lay', { amount: 30, number: 11 }), CRAPLESS).delta).toBe(9)
  })
})

describe('Lay odds may win up to the Pass odds cap (6x the flat under 3-4-5x)', () => {
  test('3-4-5x: a don\'t player may lay 6x on every point', () => {
    for (const p of [4, 5, 6, 8, 9, 10]) expect(getMaxLayOdds(10, p, '3-4-5x')).toBe(60)
  })
  test('2x: lay 4x on 4/10, 3x on 5/9, 2.4x on 6/8 (the win is capped at 2x)', () => {
    expect(getMaxLayOdds(10, 4, '2x')).toBe(40)
    expect(getMaxLayOdds(10, 9, '2x')).toBe(30)
    expect(getMaxLayOdds(10, 6, '2x')).toBe(24)
  })
})

describe('Crapless 3-4-5x odds on 2/3/11/12 (app: max odds pays 6x the line bet)', () => {
  test('1x on 2 and 12, 2x on 3 and 11', () => {
    expect(getMaxOdds(10, 2, '3-4-5x')).toBe(10)
    expect(getMaxOdds(10, 12, '3-4-5x')).toBe(10)
    expect(getMaxOdds(10, 3, '3-4-5x')).toBe(20)
    expect(getMaxOdds(10, 11, '3-4-5x')).toBe(20)
  })
})

describe('Come and Don\'t Come are made only after a point is set', () => {
  test('not on the come-out', () => {
    expect(isValidBetForPhase('come', 'come-out')).toBe(false)
    expect(isValidBetForPhase('dont-come', 'come-out')).toBe(false)
    expect(isValidBetForPhase('come', 'point')).toBe(true)
    expect(isValidBetForPhase('dont-come', 'point')).toBe(true)
  })
})

describe('Come odds are off on the come-out: returned on a decision', () => {
  test('a 7 on the come-out loses the come bet but returns its odds', () => {
    const o = only([3, 4], 'come-out', null, bet('come', { amount: 10, odds: 20, comePoint: 6 }))
    expect(o.result).toBe('lose')
    expect(o.delta).toBe(-10)
  })
  test('the come point on the come-out wins the flat bet only', () => {
    const o = only([3, 3], 'come-out', null, bet('come', { amount: 10, odds: 20, comePoint: 6 }))
    expect(o.result).toBe('win')
    expect(o.delta).toBe(10)
  })
  test('in the point phase come odds work as before', () => {
    const o = only([3, 3], 'point', 9, bet('come', { amount: 10, odds: 20, comePoint: 6 }))
    expect(o.delta).toBe(10 + 24)
  })
  test('don\'t come lay odds stay working on the come-out', () => {
    const o = only([3, 4], 'come-out', null, bet('dont-come', { amount: 10, odds: 12, comePoint: 6 }))
    expect(o.result).toBe('win')
    expect(o.delta).toBe(10 + 10)
  })
})

describe('Strategy ratings follow the sourced house edges', () => {
  test('buy and lay (vig on wins only, 1.67%-2.27%) are acceptable', () => {
    expect(getBetQuality('buy', false, false, 4)).toBe('acceptable')
    expect(getBetQuality('lay', false, false, 6)).toBe('acceptable')
  })
  test('crapless place 2/3/11/12 (10%-14.29%) are avoid', () => {
    for (const n of [2, 3, 11, 12]) expect(getBetQuality('place', false, false, n)).toBe('avoid')
  })
})

describe('Clean odds amounts pay exactly', () => {
  test('take odds: 6/8 in 5s, 5/9 in 2s, 4/10 and crapless points any amount', () => {
    expect(isCleanOdds(10, 6)).toBe(true)
    expect(isCleanOdds(12, 8)).toBe(false)
    expect(isCleanOdds(4, 5)).toBe(true)
    expect(isCleanOdds(5, 9)).toBe(false)
    for (const p of [2, 3, 4, 10, 11, 12]) expect(isCleanOdds(7, p)).toBe(true)
    expect(isCleanOdds(0, 6)).toBe(false)
  })
  test('lay odds: 4/10 in 2s, 5/9 in 3s, 6/8 in 6s', () => {
    expect(isCleanLayOdds(20, 4)).toBe(true)
    expect(isCleanLayOdds(15, 10)).toBe(false)
    expect(isCleanLayOdds(30, 5)).toBe(true)
    expect(isCleanLayOdds(20, 9)).toBe(false)
    expect(isCleanLayOdds(60, 6)).toBe(true)
    expect(isCleanLayOdds(50, 8)).toBe(false)
    expect(isCleanLayOdds(0, 4)).toBe(false)
  })
})

describe('Buy and Lay minimums keep the $1 vig meaningful (rules doc: some casinos require $20)', () => {
  test('a buy is at least $20', () => {
    for (const n of [4, 5, 6, 8, 9, 10, 2, 3, 11, 12]) expect(minBuyLayAmount('buy', n)).toBe(20)
  })
  test('a lay must win at least $20', () => {
    expect(minBuyLayAmount('lay', 4)).toBe(40)
    expect(minBuyLayAmount('lay', 9)).toBe(30)
    expect(minBuyLayAmount('lay', 6)).toBe(24)
    expect(minBuyLayAmount('lay', 3)).toBe(60)
    expect(minBuyLayAmount('lay', 12)).toBe(120)
  })
  test('the first tap on a Buy or Lay row places the minimum', () => {
    expect(suggestedBetIncrement('buy', 6)).toBe(20)
    expect(suggestedBetIncrement('lay', 4)).toBe(40)
    expect(suggestedBetIncrement('lay', 6)).toBe(24)
  })
  test('at the minimum, every winning buy and lay nets more than $0', () => {
    for (const n of [4, 5, 6, 8, 9, 10]) {
      const sum = n <= 6 ? [1, n - 1] : [n - 6, 6]
      expect(only(sum as [number, number], 'point', 99, bet('buy', { amount: 20, number: n })).delta).toBeGreaterThan(0)
      expect(only([3, 4], 'point', 99, bet('lay', { amount: minBuyLayAmount('lay', n), number: n })).delta).toBeGreaterThan(0)
    }
  })
})

describe('Clean place amounts (Assist hint) follow the payout table', () => {
  test('6/8 in 6s, 4/5/9/10 in 5s', () => {
    expect(isCleanPlace(12, 6)).toBe(true)
    expect(isCleanPlace(10, 8)).toBe(false)
    expect(isCleanPlace(15, 5)).toBe(true)
    expect(isCleanPlace(12, 10)).toBe(false)
  })
  test('crapless 2/12 at 25 to 5 always pay whole dollars; 3/11 at 13 to 5 need 5s', () => {
    expect(isCleanPlace(3, 2)).toBe(true)
    expect(isCleanPlace(5, 3)).toBe(true)
    expect(isCleanPlace(4, 11)).toBe(false)
    expect(isCleanPlace(0, 6)).toBe(false)
  })
})
