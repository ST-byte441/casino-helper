import {
  createDeck,
  dealCard,
  scoreHand,
  isSoft,
  canDouble,
  canSplit,
  canResplitAces,
  canSurrender,
  shouldDealerHit,
  resolveHand,
  needsReshuffle,
} from '../../features/blackjack/engine'
import { Card, TableRules } from '../../lib/types'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'

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

const rules = DEFAULT_TABLE_RULES  // H17, 6 decks, 3:2, DAS, no resplit aces, late surrender

describe('canDouble', () => {
  test('true on first two cards', () => {
    expect(canDouble([card('7'), card('4')], false, rules)).toBe(true)
  })

  test('false on three cards', () => {
    expect(canDouble([card('3'), card('4'), card('4')], false, rules)).toBe(false)
  })

  test('false post-split when doubleAfterSplit is off', () => {
    const nodasRules: TableRules = { ...rules, doubleAfterSplit: false }
    expect(canDouble([card('7'), card('4')], true, nodasRules)).toBe(false)
  })
})

describe('canSplit', () => {
  test('true when both cards have same value', () => {
    expect(canSplit([card('8'), card('8')])).toBe(true)
  })

  test('true for any two 10-value cards', () => {
    expect(canSplit([card('K'), card('Q')])).toBe(true)
  })

  test('false on different values', () => {
    expect(canSplit([card('7'), card('8')])).toBe(false)
  })
})

describe('canResplitAces', () => {
  test('false when resplitAces rule is off', () => {
    expect(canResplitAces([card('A'), card('A')], rules)).toBe(false)
  })

  test('true when resplitAces rule is on', () => {
    const resplitRules: TableRules = { ...rules, resplitAces: true }
    expect(canResplitAces([card('A'), card('A')], resplitRules)).toBe(true)
  })
})

describe('canSurrender', () => {
  test('true on first two cards with late surrender', () => {
    expect(canSurrender([card('J'), card('6')], rules)).toBe(true)
  })

  test('false on three cards', () => {
    expect(canSurrender([card('5'), card('6'), card('5')], rules)).toBe(false)
  })

  test('false when surrender is none', () => {
    const noSurrender: TableRules = { ...rules, surrender: 'none' }
    expect(canSurrender([card('J'), card('6')], noSurrender)).toBe(false)
  })
})

describe('shouldDealerHit', () => {
  test('dealer hits on hard 16', () => {
    expect(shouldDealerHit([card('9'), card('7')], rules)).toBe(true)
  })

  test('dealer stands on hard 17', () => {
    expect(shouldDealerHit([card('9'), card('8')], rules)).toBe(false)
  })

  test('dealer hits on soft 17 under H17', () => {
    expect(shouldDealerHit([card('A'), card('6')], rules)).toBe(true)
  })

  test('dealer stands on soft 17 under S17', () => {
    const s17Rules: TableRules = { ...rules, dealerSoft17: 'S17' }
    expect(shouldDealerHit([card('A'), card('6')], s17Rules)).toBe(false)
  })
})

describe('resolveHand', () => {
  test('player blackjack wins 1.5x with 3:2', () => {
    const result = resolveHand([card('A'), card('K')], [card('9'), card('8')], 100, rules)
    expect(result.outcome).toBe('blackjack')
    expect(result.delta).toBe(150)
  })

  test('player blackjack wins 1.2x with 6:5', () => {
    const r: TableRules = { ...rules, payoutMode: '6:5' }
    const result = resolveHand([card('A'), card('K')], [card('9'), card('8')], 100, r)
    expect(result.outcome).toBe('blackjack')
    expect(result.delta).toBe(120)
  })

  test('player wins regular hand', () => {
    const result = resolveHand([card('K'), card('9')], [card('8'), card('9')], 50, rules)
    expect(result.outcome).toBe('win')
    expect(result.delta).toBe(50)
  })

  test('player busts', () => {
    const result = resolveHand([card('K'), card('7'), card('9')], [card('8'), card('9')], 50, rules)
    expect(result.outcome).toBe('bust')
    expect(result.delta).toBe(-50)
  })

  test('push returns 0 delta', () => {
    const result = resolveHand([card('K'), card('8')], [card('9'), card('9')], 50, rules)
    expect(result.outcome).toBe('push')
    expect(result.delta).toBe(0)
  })

  test('player loses to higher dealer', () => {
    const result = resolveHand([card('K'), card('7')], [card('9'), card('9')], 50, rules)
    expect(result.outcome).toBe('lose')
    expect(result.delta).toBe(-50)
  })

  test('both blackjack is a push', () => {
    const result = resolveHand([card('A'), card('K')], [card('A'), card('Q')], 50, rules)
    expect(result.outcome).toBe('push')
    expect(result.delta).toBe(0)
  })

  test('player wins when dealer busts', () => {
    const result = resolveHand([card('K'), card('8')], [card('K'), card('7'), card('9')], 50, rules)
    expect(result.outcome).toBe('win')
    expect(result.delta).toBe(50)
  })
})

describe('needsReshuffle', () => {
  test('true when fewer than 25% of cards remain', () => {
    const fullDeck = createDeck(1)
    const smallDeck = fullDeck.slice(0, 10) // 10 of 52 < 25%
    expect(needsReshuffle(smallDeck, 1)).toBe(true)
  })

  test('false when more than 25% remain', () => {
    const fullDeck = createDeck(1)
    expect(needsReshuffle(fullDeck, 1)).toBe(false)
  })
})
