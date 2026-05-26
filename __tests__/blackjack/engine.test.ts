import {
  createDeck,
  dealCard,
  scoreHand,
  isSoft,
} from '../../features/blackjack/engine'
import { Card } from '../../lib/types'

const card = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })

describe('createDeck', () => {
  test('creates 52 cards per deck', () => {
    expect(createDeck(1)).toHaveLength(52)
    expect(createDeck(6)).toHaveLength(312)
  })

  test('contains 4 aces in a single deck', () => {
    const deck = createDeck(1)
    expect(deck.filter(c => c.value === 'A')).toHaveLength(4)
  })
})

describe('dealCard', () => {
  test('removes the top card from the deck', () => {
    const deck = createDeck(1)
    const [dealtCard, remaining] = dealCard(deck)
    expect(remaining).toHaveLength(51)
    expect(dealtCard).toBeDefined()
  })
})

describe('scoreHand', () => {
  test('scores numeric cards correctly', () => {
    expect(scoreHand([card('7'), card('8')])).toBe(15)
  })

  test('scores face cards as 10', () => {
    expect(scoreHand([card('K'), card('Q')])).toBe(20)
  })

  test('scores ace as 11 when it does not bust', () => {
    expect(scoreHand([card('A'), card('9')])).toBe(20)
  })

  test('scores ace as 1 when 11 would bust', () => {
    expect(scoreHand([card('A'), card('9'), card('5')])).toBe(15)
  })

  test('handles multiple aces', () => {
    expect(scoreHand([card('A'), card('A')])).toBe(12)
  })

  test('scores blackjack as 21', () => {
    expect(scoreHand([card('A'), card('K')])).toBe(21)
  })
})

describe('isSoft', () => {
  test('returns true when ace counts as 11', () => {
    expect(isSoft([card('A'), card('7')])).toBe(true)
  })

  test('returns false when ace counts as 1', () => {
    expect(isSoft([card('A'), card('9'), card('5')])).toBe(false)
  })

  test('returns false when no ace', () => {
    expect(isSoft([card('8'), card('7')])).toBe(false)
  })
})
