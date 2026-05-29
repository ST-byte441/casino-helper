import { Card, BaccaratBet, BaccaratOutcome } from '../../lib/types'
import { SUITS, VALUES } from '../../lib/constants'

export function baccaratValue(card: Card): number {
  if (card.value === 'A') return 1
  if (['10', 'J', 'Q', 'K'].includes(card.value)) return 0
  return parseInt(card.value, 10)
}

export function scoreHand(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + baccaratValue(card), 0) % 10
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildDeck(): Card[] {
  const deck: Card[] = []
  for (let d = 0; d < 8; d++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({ suit, value })
      }
    }
  }
  return shuffle(deck)
}

export function dealHands(deck: Card[]): { playerHand: Card[], bankerHand: Card[], deck: Card[] } {
  const [p1, b1, p2, b2, ...rest] = deck
  return { playerHand: [p1, p2], bankerHand: [b1, b2], deck: rest }
}

export function isNatural(hand: Card[]): boolean {
  if (hand.length !== 2) return false
  const total = scoreHand(hand)
  return total === 8 || total === 9
}

export function isPair(hand: Card[]): boolean {
  return hand[0].value === hand[1].value
}

export function shouldPlayerDraw(playerTotal: number): boolean {
  return playerTotal <= 5
}

export function shouldBankerDraw(
  bankerTotal: number,
  playerDrewThird: boolean,
  playerThirdCard?: number
): boolean {
  if (bankerTotal >= 8) return false
  if (bankerTotal === 7) return false
  if (!playerDrewThird) return bankerTotal <= 5
  const p = playerThirdCard!
  if (bankerTotal <= 2) return true
  if (bankerTotal === 3) return p !== 8
  if (bankerTotal === 4) return p >= 2 && p <= 7
  if (bankerTotal === 5) return p >= 4 && p <= 7
  if (bankerTotal === 6) return p === 6 || p === 7
  return false
}
