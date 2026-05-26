import { Card, Value, TableRules, Outcome } from '../../lib/types'
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

// "Soft" means at least one Ace is counted as 11 (standard blackjack definition used for strategy lookups).
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

export function canDouble(hand: Card[], isPostSplit: boolean, rules: TableRules): boolean {
  if (hand.length !== 2) return false
  if (isPostSplit && !rules.doubleAfterSplit) return false
  return true
}

export function canSplit(hand: Card[]): boolean {
  if (hand.length !== 2) return false
  const val = (v: Value) => (['J','Q','K','10'].includes(v) ? '10' : v)
  return val(hand[0].value) === val(hand[1].value)
}

export function canResplitAces(hand: Card[], rules: TableRules): boolean {
  return rules.resplitAces && canSplit(hand) && hand[0].value === 'A'
}

// Both 'late' and 'early' are treated identically here (allowed on first 2 cards).
// The distinction (early = before dealer peek) is enforced by the UI phase, not this function.
export function canSurrender(hand: Card[], rules: TableRules): boolean {
  if (rules.surrender === 'none') return false
  return hand.length === 2
}

export function shouldDealerHit(dealerHand: Card[], rules: TableRules): boolean {
  const score = scoreHand(dealerHand)
  if (score < 17) return true
  if (score === 17 && isSoft(dealerHand) && rules.dealerSoft17 === 'H17') return true
  return false
}

function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && scoreHand(hand) === 21
}

export function resolveHand(
  playerHand: Card[],
  dealerHand: Card[],
  bet: number,
  rules: TableRules
): { outcome: Outcome; delta: number } {
  const playerScore = scoreHand(playerHand)
  const dealerScore = scoreHand(dealerHand)

  if (playerScore > 21) return { outcome: 'bust', delta: -bet }

  if (isBlackjack(playerHand) && !isBlackjack(dealerHand)) {
    const multiplier = rules.payoutMode === '3:2' ? 1.5 : 1.2
    // Math.floor: all supported chip denominations (15/25/50) produce whole-number payouts.
    return { outcome: 'blackjack', delta: Math.floor(bet * multiplier) }
  }

  if (isBlackjack(dealerHand) && !isBlackjack(playerHand)) {
    return { outcome: 'lose', delta: -bet }
  }

  if (playerScore > dealerScore || dealerScore > 21) return { outcome: 'win', delta: bet }
  if (playerScore === dealerScore) return { outcome: 'push', delta: 0 }
  return { outcome: 'lose', delta: -bet }
}

export function needsReshuffle(deck: Card[], deckCount: number): boolean {
  return deck.length < deckCount * 52 * 0.25
}
