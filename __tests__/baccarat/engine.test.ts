import {
  baccaratValue, scoreHand, buildDeck, dealHands, isNatural, isPair,
  shouldPlayerDraw, shouldBankerDraw, resolveRound, calculateDeltas,
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

describe('shouldPlayerDraw', () => {
  test('draws on 0–5', () => {
    for (let i = 0; i <= 5; i++) expect(shouldPlayerDraw(i)).toBe(true)
  })
  test('stands on 6–9', () => {
    for (let i = 6; i <= 9; i++) expect(shouldPlayerDraw(i)).toBe(false)
  })
})

describe('shouldBankerDraw — player did not draw', () => {
  test('draws on 0–5', () => {
    for (let i = 0; i <= 5; i++) expect(shouldBankerDraw(i, false)).toBe(true)
  })
  test('stands on 6–7', () => {
    expect(shouldBankerDraw(6, false)).toBe(false)
    expect(shouldBankerDraw(7, false)).toBe(false)
  })
})

describe('shouldBankerDraw — player drew third card', () => {
  test('banker 0-2: always draws regardless of player third card', () => {
    for (let b = 0; b <= 2; b++) {
      for (let p = 0; p <= 9; p++) expect(shouldBankerDraw(b, true, p)).toBe(true)
    }
  })
  test('banker 3: draws on 0-7 and 9, stands on 8', () => {
    for (let p = 0; p <= 7; p++) expect(shouldBankerDraw(3, true, p)).toBe(true)
    expect(shouldBankerDraw(3, true, 8)).toBe(false)
    expect(shouldBankerDraw(3, true, 9)).toBe(true)
  })
  test('banker 4: draws on 2-7, stands on 0,1,8,9', () => {
    for (let p = 2; p <= 7; p++) expect(shouldBankerDraw(4, true, p)).toBe(true)
    for (const p of [0, 1, 8, 9]) expect(shouldBankerDraw(4, true, p)).toBe(false)
  })
  test('banker 5: draws on 4-7, stands on 0-3 and 8-9', () => {
    for (let p = 4; p <= 7; p++) expect(shouldBankerDraw(5, true, p)).toBe(true)
    for (const p of [0, 1, 2, 3, 8, 9]) expect(shouldBankerDraw(5, true, p)).toBe(false)
  })
  test('banker 6: draws on 6-7, stands on all others', () => {
    expect(shouldBankerDraw(6, true, 6)).toBe(true)
    expect(shouldBankerDraw(6, true, 7)).toBe(true)
    for (const p of [0, 1, 2, 3, 4, 5, 8, 9]) expect(shouldBankerDraw(6, true, p)).toBe(false)
  })
  test('banker 7: always stands', () => {
    for (let p = 0; p <= 9; p++) expect(shouldBankerDraw(7, true, p)).toBe(false)
  })
})

describe('resolveRound', () => {
  test('player wins when player score higher', () => {
    expect(resolveRound([c('7'), c('2')], [c('5'), c('3')])).toBe('player') // 9 vs 8
  })
  test('banker wins when banker score higher', () => {
    expect(resolveRound([c('2'), c('3')], [c('7'), c('2')])).toBe('banker') // 5 vs 9
  })
  test('tie when scores equal', () => {
    expect(resolveRound([c('4'), c('5')], [c('3'), c('6')])).toBe('tie') // 9 vs 9
  })
})

describe('calculateDeltas', () => {
  const playerHand: Card[] = [c('7', '♠'), c('2', '♠')]
  const bankerHand: Card[] = [c('5', '♠'), c('3', '♠')]
  const pairPlayerHand: Card[] = [c('7', '♠'), c('7', '♥')]
  const pairBankerHand: Card[] = [c('5', '♠'), c('5', '♥')]

  test('player bet wins 1:1 on player outcome', () => {
    const d = calculateDeltas({ player: 10 }, 'player', playerHand, bankerHand)
    expect(d.player).toBe(10)
  })
  test('player bet loses on banker outcome', () => {
    const d = calculateDeltas({ player: 10 }, 'banker', playerHand, bankerHand)
    expect(d.player).toBe(-10)
  })
  test('player bet pushes on tie (delta = 0)', () => {
    const d = calculateDeltas({ player: 10 }, 'tie', playerHand, bankerHand)
    expect(d.player).toBe(0)
  })
  test('banker bet pays 0.95:1 on banker outcome', () => {
    const d = calculateDeltas({ banker: 20 }, 'banker', playerHand, bankerHand)
    expect(d.banker).toBe(19)
  })
  test('banker bet loses on player outcome', () => {
    const d = calculateDeltas({ banker: 20 }, 'player', playerHand, bankerHand)
    expect(d.banker).toBe(-20)
  })
  test('banker bet pushes on tie (delta = 0)', () => {
    const d = calculateDeltas({ banker: 20 }, 'tie', playerHand, bankerHand)
    expect(d.banker).toBe(0)
  })
  test('tie bet pays 8:1 on tie', () => {
    const d = calculateDeltas({ tie: 10 }, 'tie', playerHand, bankerHand)
    expect(d.tie).toBe(80)
  })
  test('tie bet loses on player or banker outcome', () => {
    expect(calculateDeltas({ tie: 10 }, 'player', playerHand, bankerHand).tie).toBe(-10)
    expect(calculateDeltas({ tie: 10 }, 'banker', playerHand, bankerHand).tie).toBe(-10)
  })
  test('player-pair pays 11:1 when player has pair', () => {
    const d = calculateDeltas({ 'player-pair': 5 }, 'player', pairPlayerHand, bankerHand)
    expect(d['player-pair']).toBe(55)
  })
  test('player-pair loses when player has no pair', () => {
    const d = calculateDeltas({ 'player-pair': 5 }, 'player', playerHand, bankerHand)
    expect(d['player-pair']).toBe(-5)
  })
  test('banker-pair pays 11:1 when banker has pair', () => {
    const d = calculateDeltas({ 'banker-pair': 5 }, 'banker', playerHand, pairBankerHand)
    expect(d['banker-pair']).toBe(55)
  })
  test('banker-pair loses when banker has no pair', () => {
    const d = calculateDeltas({ 'banker-pair': 5 }, 'banker', playerHand, bankerHand)
    expect(d['banker-pair']).toBe(-5)
  })
  test('multiple bets resolved together', () => {
    const d = calculateDeltas({ player: 10, tie: 5 }, 'player', playerHand, bankerHand)
    expect(d.player).toBe(10)
    expect(d.tie).toBe(-5)
  })
})
