import { getOptimalAction } from '../../features/blackjack/strategy'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'
import { Card, TableRules } from '../../lib/types'

const card = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })
const rules = DEFAULT_TABLE_RULES

describe('getOptimalAction — pairs', () => {
  test('always splits aces', () => {
    expect(getOptimalAction([card('A'), card('A')], card('9'), rules)).toBe('split')
  })
  test('always splits 8s', () => {
    expect(getOptimalAction([card('8'), card('8')], card('6'), rules)).toBe('split')
  })
  test('always splits 8s even vs dealer 10', () => {
    expect(getOptimalAction([card('8'), card('8')], card('K'), rules)).toBe('split')
  })
  test('never splits 10s', () => {
    expect(getOptimalAction([card('K'), card('Q')], card('6'), rules)).toBe('stand')
  })
  test('never splits 5s', () => {
    expect(getOptimalAction([card('5'), card('5')], card('6'), rules)).not.toBe('split')
  })
})

describe('getOptimalAction — hard totals', () => {
  test('stands on hard 17+', () => {
    expect(getOptimalAction([card('K'), card('7')], card('9'), rules)).toBe('stand')
  })
  test('hits on hard 12 vs dealer 2', () => {
    expect(getOptimalAction([card('7'), card('5')], card('2'), rules)).toBe('hit')
  })
  test('stands on hard 13 vs dealer 6', () => {
    expect(getOptimalAction([card('7'), card('6')], card('6'), rules)).toBe('stand')
  })
  test('doubles hard 11 vs dealer 6', () => {
    expect(getOptimalAction([card('7'), card('4')], card('6'), rules)).toBe('double')
  })
  test('doubles hard 10 vs dealer 9', () => {
    expect(getOptimalAction([card('6'), card('4')], card('9'), rules)).toBe('double')
  })
  test('hits hard 10 vs dealer 10', () => {
    expect(getOptimalAction([card('6'), card('4')], card('K'), rules)).toBe('hit')
  })
})

describe('getOptimalAction — soft totals', () => {
  test('doubles soft 19 (A-8) vs dealer 6', () => {
    expect(getOptimalAction([card('A'), card('8')], card('6'), rules)).toBe('double')
  })
  test('stands on soft 19 (A-8) vs dealer 7', () => {
    expect(getOptimalAction([card('A'), card('8')], card('7'), rules)).toBe('stand')
  })
  test('doubles soft 18 (A-7) vs dealer 3', () => {
    expect(getOptimalAction([card('A'), card('7')], card('3'), rules)).toBe('double')
  })
  test('hits soft 18 (A-7) vs dealer 9', () => {
    expect(getOptimalAction([card('A'), card('7')], card('9'), rules)).toBe('hit')
  })
  test('doubles soft 18 (A-7) vs dealer 2 under H17', () => {
    expect(getOptimalAction([card('A'), card('7')], card('2'), rules)).toBe('double')
  })
  test('stands on soft 18 (A-7) vs dealer 2 under S17', () => {
    const s17Rules: TableRules = { ...rules, dealerSoft17: 'S17' }
    expect(getOptimalAction([card('A'), card('7')], card('2'), s17Rules)).toBe('stand')
  })
  test('hits soft 13 (A-2) vs dealer 4', () => {
    expect(getOptimalAction([card('A'), card('2')], card('4'), rules)).toBe('hit')
  })
})

describe('getOptimalAction — surrender', () => {
  test('surrenders 16 vs dealer 10 with late surrender', () => {
    expect(getOptimalAction([card('9'), card('7')], card('K'), rules)).toBe('surrender')
  })
  test('does not surrender when surrender is none', () => {
    const noSurrender: TableRules = { ...rules, surrender: 'none' }
    expect(getOptimalAction([card('9'), card('7')], card('K'), noSurrender)).not.toBe('surrender')
  })
  test('does not suggest surrender on a 3-card 16 (surrender no longer available)', () => {
    // 7 + 3 + 6 = 16 vs dealer 9 — strategy says surrender but action is unavailable after hitting
    expect(getOptimalAction([card('7'), card('3'), card('6')], card('9'), rules)).not.toBe('surrender')
  })
})

describe('getOptimalAction — when a move isn’t allowed, the right fallback', () => {
  const noDouble = { double: false, split: true, surrender: true }
  const s17: TableRules = { ...rules, dealerSoft17: 'S17' }

  test('soft 18 is "double, else stand": A-2-5 vs 5 stands', () => {
    expect(getOptimalAction([card('A'), card('2'), card('5')], card('5'), rules, noDouble)).toBe('stand')
    expect(getOptimalAction([card('A'), card('7')], card('4'), rules, noDouble)).toBe('stand')
    expect(getOptimalAction([card('A'), card('7')], card('3'), s17, noDouble)).toBe('stand')
  })

  test('soft 19 vs 6 is "double, else stand"', () => {
    expect(getOptimalAction([card('A'), card('8')], card('6'), rules, noDouble)).toBe('stand')
  })

  test('soft 17 and lower, and hard 9–11, are "double, else hit"', () => {
    expect(getOptimalAction([card('A'), card('6')], card('4'), rules, noDouble)).toBe('hit')
    expect(getOptimalAction([card('A'), card('2')], card('5'), rules, noDouble)).toBe('hit')
    expect(getOptimalAction([card('6'), card('5')], card('6'), rules, noDouble)).toBe('hit')
    expect(getOptimalAction([card('5'), card('4')], card('4'), rules, noDouble)).toBe('hit')
  })

  test('a pair that can’t be split is played as its total', () => {
    const noSplit = { double: true, split: false, surrender: true }
    expect(getOptimalAction([card('8'), card('8')], card('6'), rules, noSplit)).toBe('stand')
    expect(getOptimalAction([card('A'), card('A')], card('6'), rules, noSplit)).toBe('hit')
    expect(getOptimalAction([card('5'), card('5')], card('6'), rules, noSplit)).toBe('double')
  })

  test('no surrender: 16 vs 10 hits', () => {
    expect(getOptimalAction([card('9'), card('7')], card('K'), rules, { double: true, split: true, surrender: false }))
      .toBe('hit')
  })

  test('with everything allowed, nothing changes', () => {
    expect(getOptimalAction([card('A'), card('7')], card('4'), rules)).toBe('double')
    expect(getOptimalAction([card('8'), card('8')], card('6'), rules)).toBe('split')
  })
})
