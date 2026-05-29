import {
  baccaratValue, scoreHand, buildDeck, dealHands, isNatural, isPair,
} from '../../features/baccarat/engine'
import { Card } from '../../lib/types'

const c = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })

describe('baccaratValue', () => {
  test('ace = 1', () => expect(baccaratValue(c('A'))).toBe(1))
  test('2–9 = pip value', () => {
    expect(baccaratValue(c('5'))).toBe(5)
    expect(baccaratValue(c('9'))).toBe(9)
  })
  test('10, J, Q, K = 0', () => {
    expect(baccaratValue(c('10'))).toBe(0)
    expect(baccaratValue(c('J'))).toBe(0)
    expect(baccaratValue(c('Q'))).toBe(0)
    expect(baccaratValue(c('K'))).toBe(0)
  })
})

describe('scoreHand', () => {
  test('7 + 8 = 5 (15 mod 10)', () => expect(scoreHand([c('7'), c('8')])).toBe(5))
  test('6 + 4 = 0 (10 mod 10)', () => expect(scoreHand([c('6'), c('4')])).toBe(0))
  test('A + 2 = 3', () => expect(scoreHand([c('A'), c('2')])).toBe(3))
  test('K + K = 0', () => expect(scoreHand([c('K'), c('K')])).toBe(0))
  test('three card: 3 + 5 + 7 = 5 (15 mod 10)', () => expect(scoreHand([c('3'), c('5'), c('7')])).toBe(5))
})

describe('buildDeck', () => {
  test('returns 416 cards (8 decks × 52)', () => expect(buildDeck()).toHaveLength(416))
})

describe('dealHands', () => {
  test('deals 2 cards to each hand, removes 4 from deck', () => {
    const deck = buildDeck()
    const { playerHand, bankerHand, deck: remaining } = dealHands(deck)
    expect(playerHand).toHaveLength(2)
    expect(bankerHand).toHaveLength(2)
    expect(remaining).toHaveLength(412)
  })
})

describe('isNatural', () => {
  test('true when two-card total is 8', () => expect(isNatural([c('3'), c('5')])).toBe(true))
  test('true when two-card total is 9', () => expect(isNatural([c('4'), c('5')])).toBe(true))
  test('false when total is 7', () => expect(isNatural([c('3'), c('4')])).toBe(false))
  test('false for three-card hand even if total is 8', () => expect(isNatural([c('2'), c('3'), c('3')])).toBe(false))
})

describe('isPair', () => {
  test('true when first two cards share value', () => expect(isPair([c('7', '♠'), c('7', '♥')])).toBe(true))
  test('false when values differ', () => expect(isPair([c('7'), c('8')])).toBe(false))
  test('K and K = true', () => expect(isPair([c('K', '♠'), c('K', '♥')])).toBe(true))
})
