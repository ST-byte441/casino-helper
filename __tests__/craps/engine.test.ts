import {
  rollDice, sumDice, isHardRoll,
  isValidBetForVariant, isValidBetForPhase, canRemoveBet, suggestedBetIncrement, getMaxOdds,
} from '../../features/craps/engine'
import { ActiveBet, CrapsTableRules } from '../../lib/types'

const defaultRules: CrapsTableRules = { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false }

describe('rollDice', () => {
  test('returns two values each between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const [d1, d2] = rollDice()
      expect(d1).toBeGreaterThanOrEqual(1)
      expect(d1).toBeLessThanOrEqual(6)
      expect(d2).toBeGreaterThanOrEqual(1)
      expect(d2).toBeLessThanOrEqual(6)
    }
  })
})

describe('sumDice', () => {
  test('sums two dice', () => {
    expect(sumDice([3, 4])).toBe(7)
    expect(sumDice([6, 6])).toBe(12)
  })
})

describe('isHardRoll', () => {
  test('true when both dice match', () => {
    expect(isHardRoll([3, 3])).toBe(true)
  })
  test('false when dice differ', () => {
    expect(isHardRoll([3, 4])).toBe(false)
  })
})

describe('isValidBetForVariant', () => {
  test('dont-pass allowed in standard', () => {
    expect(isValidBetForVariant('dont-pass', 'craps')).toBe(true)
  })
  test('dont-pass not allowed in crapless', () => {
    expect(isValidBetForVariant('dont-pass', 'crapless')).toBe(false)
  })
  test('dont-pass not allowed in easy', () => {
    expect(isValidBetForVariant('dont-pass', 'easy')).toBe(false)
  })
  test('come allowed in standard and crapless', () => {
    expect(isValidBetForVariant('come', 'craps')).toBe(true)
    expect(isValidBetForVariant('come', 'crapless')).toBe(true)
  })
  test('come not allowed in easy', () => {
    expect(isValidBetForVariant('come', 'easy')).toBe(false)
  })
  test('buy allowed in standard and crapless', () => {
    expect(isValidBetForVariant('buy', 'craps')).toBe(true)
    expect(isValidBetForVariant('buy', 'crapless')).toBe(true)
  })
  test('buy not allowed in easy', () => {
    expect(isValidBetForVariant('buy', 'easy')).toBe(false)
  })
  test('low-field only in easy', () => {
    expect(isValidBetForVariant('low-field', 'easy')).toBe(true)
    expect(isValidBetForVariant('low-field', 'craps')).toBe(false)
    expect(isValidBetForVariant('low-field', 'crapless')).toBe(false)
  })
  test('big6 not in easy', () => {
    expect(isValidBetForVariant('big6', 'easy')).toBe(false)
    expect(isValidBetForVariant('big6', 'craps')).toBe(true)
  })
})

describe('isValidBetForPhase', () => {
  test('pass only on come-out', () => {
    expect(isValidBetForPhase('pass', 'come-out')).toBe(true)
    expect(isValidBetForPhase('pass', 'point')).toBe(false)
  })
  test('place only during point phase', () => {
    expect(isValidBetForPhase('place', 'point')).toBe(true)
    expect(isValidBetForPhase('place', 'come-out')).toBe(true)
  })
  test('field anytime', () => {
    expect(isValidBetForPhase('field', 'come-out')).toBe(true)
    expect(isValidBetForPhase('field', 'point')).toBe(true)
  })
})

describe('canRemoveBet', () => {
  const makeBet = (type: ActiveBet['type'], overrides: Partial<ActiveBet> = {}): ActiveBet =>
    ({ id: '1', type, amount: 10, working: true, ...overrides })

  test('pass cannot be removed during point phase', () => {
    expect(canRemoveBet(makeBet('pass'), 'point')).toBe(false)
  })
  test('pass can be removed on come-out', () => {
    expect(canRemoveBet(makeBet('pass'), 'come-out')).toBe(true)
  })
  test('dont-pass can be removed during point phase', () => {
    expect(canRemoveBet(makeBet('dont-pass'), 'point')).toBe(true)
  })
  test('come cannot be removed once comePoint is set', () => {
    expect(canRemoveBet(makeBet('come', { comePoint: 6 }), 'point')).toBe(false)
  })
  test('place can always be removed', () => {
    expect(canRemoveBet(makeBet('place', { number: 6 }), 'point')).toBe(true)
  })
})

describe('suggestedBetIncrement', () => {
  test('place 6 and 8 increment by 6', () => {
    expect(suggestedBetIncrement('place', 6)).toBe(6)
    expect(suggestedBetIncrement('place', 8)).toBe(6)
  })
  test('place 5 and 9 increment by 5', () => {
    expect(suggestedBetIncrement('place', 5)).toBe(5)
    expect(suggestedBetIncrement('place', 9)).toBe(5)
  })
  test('horn increments by 4', () => {
    expect(suggestedBetIncrement('horn')).toBe(4)
  })
  test('world increments by 5', () => {
    expect(suggestedBetIncrement('world')).toBe(5)
  })
  test('default increment is 1', () => {
    expect(suggestedBetIncrement('field')).toBe(1)
    expect(suggestedBetIncrement('any-7')).toBe(1)
  })
})

describe('getMaxOdds', () => {
  test('3-4-5x: point 6 allows 5x odds', () => {
    expect(getMaxOdds(10, 6, '3-4-5x')).toBe(50)
  })
  test('3-4-5x: point 5 allows 4x odds', () => {
    expect(getMaxOdds(10, 5, '3-4-5x')).toBe(40)
  })
  test('3-4-5x: point 4 allows 3x odds', () => {
    expect(getMaxOdds(10, 4, '3-4-5x')).toBe(30)
  })
  test('2x: point 6 allows 2x odds', () => {
    expect(getMaxOdds(10, 6, '2x')).toBe(20)
  })
  test('10x: point 4 allows 10x odds', () => {
    expect(getMaxOdds(10, 4, '10x')).toBe(100)
  })
})
