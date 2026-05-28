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

import { calculatePayout } from '../../features/craps/engine'

const makeBet = (type: ActiveBet['type'], overrides: Partial<ActiveBet> = {}): ActiveBet =>
  ({ id: '1', type, amount: 10, working: true, ...overrides })

describe('calculatePayout — single-roll bets', () => {
  const rules: CrapsTableRules = { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false }
  const rules3on12: CrapsTableRules = { ...rules, fieldPays3on12: true }
  const easyRules: CrapsTableRules = { ...rules, variant: 'easy' }

  test('field wins 1:1 on 3,4,9,10,11', () => {
    for (const sum of [3, 4, 9, 10, 11]) {
      const dice: [number, number] = sum <= 6 ? [1, sum - 1] : [sum - 6, 6]
      expect(calculatePayout(makeBet('field'), dice, null, rules)).toBe(10)
    }
  })
  test('field wins 2:1 on 2', () => {
    expect(calculatePayout(makeBet('field'), [1, 1], null, rules)).toBe(20)
  })
  test('field wins 2:1 on 12 by default', () => {
    expect(calculatePayout(makeBet('field'), [6, 6], null, rules)).toBe(20)
  })
  test('field wins 3:1 on 12 when fieldPays3on12', () => {
    expect(calculatePayout(makeBet('field'), [6, 6], null, rules3on12)).toBe(30)
  })
  test('field loses on 5,6,7,8', () => {
    expect(calculatePayout(makeBet('field'), [3, 2], null, rules)).toBe(-10)
    expect(calculatePayout(makeBet('field'), [3, 3], null, rules)).toBe(-10)
    expect(calculatePayout(makeBet('field'), [3, 4], null, rules)).toBe(-10)
    expect(calculatePayout(makeBet('field'), [4, 4], null, rules)).toBe(-10)
  })

  test('low-field wins 2:1 on 2,3,4', () => {
    expect(calculatePayout(makeBet('low-field'), [1, 1], null, easyRules)).toBe(20)
    expect(calculatePayout(makeBet('low-field'), [1, 2], null, easyRules)).toBe(20)
    expect(calculatePayout(makeBet('low-field'), [2, 2], null, easyRules)).toBe(20)
  })
  test('low-field loses on other rolls', () => {
    expect(calculatePayout(makeBet('low-field'), [3, 4], null, easyRules)).toBe(-10)
  })
  test('high-field wins 3:1 on 10,11,12', () => {
    expect(calculatePayout(makeBet('high-field'), [5, 5], null, easyRules)).toBe(30)
    expect(calculatePayout(makeBet('high-field'), [5, 6], null, easyRules)).toBe(30)
    expect(calculatePayout(makeBet('high-field'), [6, 6], null, easyRules)).toBe(30)
  })

  test('any-7 pays 4:1 on 7', () => {
    expect(calculatePayout(makeBet('any-7'), [3, 4], null, rules)).toBe(40)
  })
  test('any-7 loses on non-7', () => {
    expect(calculatePayout(makeBet('any-7'), [3, 3], null, rules)).toBe(-10)
  })
  test('any-craps pays 7:1 on 2,3,12', () => {
    expect(calculatePayout(makeBet('any-craps'), [1, 1], null, rules)).toBe(70)
    expect(calculatePayout(makeBet('any-craps'), [1, 2], null, rules)).toBe(70)
    expect(calculatePayout(makeBet('any-craps'), [6, 6], null, rules)).toBe(70)
  })
  test('craps-2 pays 30:1 on 2 only', () => {
    expect(calculatePayout(makeBet('craps-2'), [1, 1], null, rules)).toBe(300)
    expect(calculatePayout(makeBet('craps-2'), [1, 2], null, rules)).toBe(-10)
  })
  test('craps-3 pays 15:1 on 3 only', () => {
    expect(calculatePayout(makeBet('craps-3'), [1, 2], null, rules)).toBe(150)
  })
  test('yo-11 pays 15:1 on 11 only', () => {
    expect(calculatePayout(makeBet('yo-11'), [5, 6], null, rules)).toBe(150)
    expect(calculatePayout(makeBet('yo-11'), [6, 6], null, rules)).toBe(-10)
  })
  test('craps-12 pays 30:1 on 12 only', () => {
    expect(calculatePayout(makeBet('craps-12'), [6, 6], null, rules)).toBe(300)
  })
  test('hi-lo pays 15:1 on 2 or 12', () => {
    expect(calculatePayout(makeBet('hi-lo'), [1, 1], null, rules)).toBe(150)
    expect(calculatePayout(makeBet('hi-lo'), [6, 6], null, rules)).toBe(150)
    expect(calculatePayout(makeBet('hi-lo'), [3, 4], null, rules)).toBe(-10)
  })
  test('ce: 7:1 on 2,3,12 and 3:1 on 11', () => {
    expect(calculatePayout(makeBet('ce'), [1, 1], null, rules)).toBe(70)
    expect(calculatePayout(makeBet('ce'), [5, 6], null, rules)).toBe(30)
    expect(calculatePayout(makeBet('ce'), [3, 4], null, rules)).toBe(-10)
  })
  test('hop-hard pays 30:1 on exact combo', () => {
    expect(calculatePayout(makeBet('hop-hard', { hopDice: [3, 3] }), [3, 3], null, rules)).toBe(300)
    expect(calculatePayout(makeBet('hop-hard', { hopDice: [3, 3] }), [2, 4], null, rules)).toBe(-10)
  })
  test('hop-easy pays 15:1 on exact combo (either order)', () => {
    expect(calculatePayout(makeBet('hop-easy', { hopDice: [2, 5] }), [2, 5], null, rules)).toBe(150)
    expect(calculatePayout(makeBet('hop-easy', { hopDice: [2, 5] }), [5, 2], null, rules)).toBe(150)
    expect(calculatePayout(makeBet('hop-easy', { hopDice: [2, 5] }), [3, 4], null, rules)).toBe(-10)
  })
  test('horn (4-unit $40 total): 2 wins at 27:4 = pays $270 net on winning number', () => {
    // $40 horn bet on [1,1] (sum=2): $10 on 2 wins at 30:1 = +$300 gross, minus $30 for other 3 units → net +$270
    expect(calculatePayout(makeBet('horn', { amount: 40 }), [1, 1], null, rules)).toBe(270)
  })
  test('horn (4-unit $40): 3 wins at 3:1 = pays $120 net', () => {
    // $10 on 3 wins at 15:1 = +$150 gross, minus $30 for others → net +$120
    expect(calculatePayout(makeBet('horn', { amount: 40 }), [1, 2], null, rules)).toBe(120)
  })
  test('horn loses on any other number', () => {
    expect(calculatePayout(makeBet('horn', { amount: 40 }), [3, 4], null, rules)).toBe(-40)
  })
})

import { resolveRoll } from '../../features/craps/engine'

describe('resolveRoll — come-out phase (standard)', () => {
  const rules: CrapsTableRules = { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false }
  const pass: ActiveBet = { id: 'p1', type: 'pass', amount: 10, working: true }

  test('7 on come-out: natural, pass wins', () => {
    const res = resolveRoll([3, 4], 'come-out', null, [pass], rules)
    expect(res.phaseChange).toBe('natural')
    expect(res.outcomes[0].result).toBe('win')
    expect(res.outcomes[0].delta).toBe(10)
    expect(res.nextPoint).toBeNull()
  })

  test('11 on come-out: natural, pass wins (standard)', () => {
    const res = resolveRoll([5, 6], 'come-out', null, [pass], rules)
    expect(res.phaseChange).toBe('natural')
    expect(res.outcomes[0].result).toBe('win')
  })

  test('2 on come-out: craps, pass loses (standard)', () => {
    const res = resolveRoll([1, 1], 'come-out', null, [pass], rules)
    expect(res.phaseChange).toBe('craps')
    expect(res.outcomes[0].result).toBe('lose')
  })

  test('dont-pass pushes on 12 come-out (standard)', () => {
    const dp: ActiveBet = { id: 'dp1', type: 'dont-pass', amount: 10, working: true }
    const res = resolveRoll([6, 6], 'come-out', null, [dp], rules)
    expect(res.outcomes[0].result).toBe('push')
  })

  test('6 on come-out: point set', () => {
    const res = resolveRoll([2, 4], 'come-out', null, [pass], rules)
    expect(res.phaseChange).toBe('point-set')
    expect(res.nextPoint).toBe(6)
    expect(res.outcomes[0].result).toBe('continue')
  })
})

describe('resolveRoll — come-out phase (crapless)', () => {
  const rules: CrapsTableRules = { variant: 'crapless', oddsMultiple: '3-4-5x', fieldPays3on12: false }
  const pass: ActiveBet = { id: 'p1', type: 'pass', amount: 10, working: true }

  test('11 on come-out sets point=11 in crapless', () => {
    const res = resolveRoll([5, 6], 'come-out', null, [pass], rules)
    expect(res.phaseChange).toBe('point-set')
    expect(res.nextPoint).toBe(11)
  })

  test('2 on come-out sets point=2 in crapless', () => {
    const res = resolveRoll([1, 1], 'come-out', null, [pass], rules)
    expect(res.phaseChange).toBe('point-set')
    expect(res.nextPoint).toBe(2)
  })
})

describe('resolveRoll — point phase', () => {
  const rules: CrapsTableRules = { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false }

  test('rolling the point: pass wins, dont-pass loses, point-made', () => {
    const pass: ActiveBet = { id: 'p1', type: 'pass', amount: 10, working: true }
    const dp: ActiveBet = { id: 'dp1', type: 'dont-pass', amount: 10, working: true }
    const res = resolveRoll([3, 3], 'point', 6, [pass, dp], rules)
    expect(res.phaseChange).toBe('point-made')
    expect(res.outcomes.find(o => o.betId === 'p1')!.result).toBe('win')
    expect(res.outcomes.find(o => o.betId === 'dp1')!.result).toBe('lose')
    expect(res.nextPoint).toBeNull()
  })

  test('rolling 7: seven-out, pass loses, dont-pass wins, place loses', () => {
    const pass: ActiveBet = { id: 'p1', type: 'pass', amount: 10, working: true }
    const place: ActiveBet = { id: 'pl1', type: 'place', amount: 12, number: 6, working: true }
    const placOff: ActiveBet = { id: 'pl2', type: 'place', amount: 12, number: 8, working: false }
    const res = resolveRoll([3, 4], 'point', 6, [pass, place, placOff], rules)
    expect(res.phaseChange).toBe('seven-out')
    expect(res.outcomes.find(o => o.betId === 'p1')!.result).toBe('lose')
    expect(res.outcomes.find(o => o.betId === 'pl1')!.result).toBe('lose')
    expect(res.outcomes.find(o => o.betId === 'pl2')!.result).toBe('continue')
  })

  test('place 6 wins when 6 rolls in point phase', () => {
    const place: ActiveBet = { id: 'pl1', type: 'place', amount: 12, number: 6, working: true }
    const res = resolveRoll([3, 3], 'point', 9, [place], rules)
    expect(res.outcomes[0].result).toBe('win')
    expect(res.outcomes[0].delta).toBe(14) // 7:6 on $12
  })

  test('buy 5 wins when 5 rolls (3:2 minus 5% vig)', () => {
    const buy: ActiveBet = { id: 'b1', type: 'buy', amount: 20, number: 5, working: true }
    const res = resolveRoll([2, 3], 'point', 9, [buy], rules)
    expect(res.outcomes[0].result).toBe('win')
    // 3:2 on $20 = $30 gross minus 5% vig on $20 = $1 → net $29
    expect(res.outcomes[0].delta).toBe(29)
  })

  test('lay 4 wins when 7 rolls (1:2 minus 5% vig)', () => {
    const lay: ActiveBet = { id: 'l1', type: 'lay', amount: 40, number: 4, working: true }
    const res = resolveRoll([3, 4], 'point', 9, [lay], rules)
    expect(res.outcomes[0].result).toBe('win')
    // 1:2 on $40 = $20 gross minus 5% vig on $40 = $2 → net $18
    expect(res.outcomes[0].delta).toBe(18)
  })

  test('hardway 6 wins on hard roll', () => {
    const hw: ActiveBet = { id: 'hw1', type: 'hardway', amount: 10, number: 6, working: true }
    const res = resolveRoll([3, 3], 'point', 9, [hw], rules)
    expect(res.outcomes[0].result).toBe('win')
    expect(res.outcomes[0].delta).toBe(90) // 9:1
  })

  test('hardway 6 loses on easy 6', () => {
    const hw: ActiveBet = { id: 'hw1', type: 'hardway', amount: 10, number: 6, working: true }
    const res = resolveRoll([2, 4], 'point', 9, [hw], rules)
    expect(res.outcomes[0].result).toBe('lose')
  })

  test('hardway 6 loses on 7', () => {
    const hw: ActiveBet = { id: 'hw1', type: 'hardway', amount: 10, number: 6, working: true }
    const res = resolveRoll([3, 4], 'point', 9, [hw], rules)
    expect(res.outcomes[0].result).toBe('lose')
  })

  test('pass line odds pay 6:5 when point is 6', () => {
    const pass: ActiveBet = { id: 'p1', type: 'pass', amount: 10, odds: 25, working: true }
    const res = resolveRoll([3, 3], 'point', 6, [pass], rules)
    expect(res.outcomes[0].result).toBe('win')
    // flat $10 wins $10; odds $25 on 6 at 6:5 = $30
    expect(res.outcomes[0].delta).toBe(40)
  })

  test('come bet placed on 5: come-point set to 5', () => {
    const come: ActiveBet = { id: 'c1', type: 'come', amount: 10, working: true }
    const res = resolveRoll([2, 3], 'point', 6, [come], rules)
    // 5 neither wins nor loses a fresh come bet — sets comePoint
    expect(res.outcomes[0].result).toBe('continue')
  })

  test('come bet with comePoint=5 wins when 5 rolls', () => {
    const come: ActiveBet = { id: 'c1', type: 'come', amount: 10, comePoint: 5, working: true }
    const res = resolveRoll([2, 3], 'point', 6, [come], rules)
    expect(res.outcomes[0].result).toBe('win')
    expect(res.outcomes[0].delta).toBe(10)
  })

  test('come bet with comePoint=5 loses on 7', () => {
    const come: ActiveBet = { id: 'c1', type: 'come', amount: 10, comePoint: 5, working: true }
    const res = resolveRoll([3, 4], 'point', 6, [come], rules)
    expect(res.outcomes[0].result).toBe('lose')
  })

  test('big6 pays 1:1 when 6 rolls', () => {
    const big6: ActiveBet = { id: 'b6', type: 'big6', amount: 10, working: true }
    const res = resolveRoll([3, 3], 'point', 9, [big6], rules)
    expect(res.outcomes[0].result).toBe('win')
    expect(res.outcomes[0].delta).toBe(10)
  })
})
