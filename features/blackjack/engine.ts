import { Card, Suit, Value, TableRules, Outcome } from '../../lib/types'
import { SUITS, VALUES } from '../../lib/constants'

export function createDeck(deckCount: number): Card[] {
  const deck: Card[] = []
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({ suit, value })
      }
    }
  }
  return shuffle(deck)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function dealCard(deck: Card[]): [Card, Card[]] {
  const [top, ...rest] = deck
  return [top, rest]
}

function cardNumericValue(value: Value): number {
  if (value === 'A') return 11
  if (['J', 'Q', 'K'].includes(value)) return 10
  return parseInt(value, 10)
}

export function scoreHand(hand: Card[]): number {
  let total = 0
  let aces = 0
  for (const card of hand) {
    if (card.value === 'A') {
      aces++
      total += 11
    } else {
      total += cardNumericValue(card.value)
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}

export function isSoft(hand: Card[]): boolean {
  const hasAce = hand.some(c => c.value === 'A')
  if (!hasAce) return false
  let total = 0
  let aces = 0
  for (const card of hand) {
    if (card.value === 'A') { aces++; total += 11 }
    else total += cardNumericValue(card.value)
  }
  let softAces = aces
  while (total > 21 && softAces > 0) { total -= 10; softAces-- }
  return softAces > 0
}
