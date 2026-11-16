import { Card, Action, TableRules } from '../../lib/types'
import { scoreHand, isSoft, canSplit, canSurrender } from './engine'

type DealerKey = 2|3|4|5|6|7|8|9|10|11  // 11 = Ace

function dealerKey(upcard: Card): DealerKey {
  const v = upcard.value
  if (v === 'A') return 11
  if (['J','Q','K'].includes(v)) return 10
  return parseInt(v, 10) as DealerKey
}

function cardTenValue(v: Card['value']): boolean {
  return ['10','J','Q','K'].includes(v)
}

// Surrender: 16 vs 9/10/A, 15 vs 10
/**
 * Early surrender (decided before the dealer checks for blackjack): hard 5–7 and 12–17 against an ace, hard 14–16
 * against a ten. Pairs count as their hard total (3-3, 6-6, 7-7, 8-8). Soft hands never. Basic strategy for early
 * surrender (Wizard of Odds); the late-surrender hands are a subset.
 */
function isEarlySurrender(score: number, soft: boolean, dk: DealerKey): boolean {
  if (soft) return false
  if (dk === 11) return (score >= 5 && score <= 7) || (score >= 12 && score <= 17)
  if (dk === 10) return score >= 14 && score <= 16
  return false
}

function getSurrenderAction(score: number, dk: DealerKey, rules: TableRules): Action | null {
  if (rules.surrender === 'none') return null
  if (score === 16 && (dk === 9 || dk === 10 || dk === 11)) return 'surrender'
  if (score === 15 && dk === 10) return 'surrender'
  return null
}

// Pairs split table
function getSplitAction(hand: Card[], dk: DealerKey): Action | null {
  if (!canSplit(hand)) return null
  const v = hand[0].value
  if (v === 'A') return 'split'
  if (v === '8') return 'split'
  if (cardTenValue(hand[0].value)) return null  // never split 10s
  if (v === '9') return (dk >= 2 && dk <= 6) || dk === 8 || dk === 9 ? 'split' : null
  if (v === '7') return dk >= 2 && dk <= 7 ? 'split' : null
  if (v === '6') return dk >= 2 && dk <= 6 ? 'split' : null
  if (v === '5') return null  // treat as hard 10
  if (v === '4') return dk === 5 || dk === 6 ? 'split' : null
  if (v === '3' || v === '2') return dk >= 2 && dk <= 7 ? 'split' : null
  return null
}

// Soft totals (hand with Ace counted as 11)
function getSoftAction(score: number, dk: DealerKey, rules: TableRules): Action {
  if (score >= 20) return 'stand'
  if (score === 19) return dk === 6 ? 'double' : 'stand'  // A-8: double vs 6
  if (score === 18) {
    // H17: double vs 2-6; S17: double vs 3-6 (stand vs 2)
    const doubleMin = rules.dealerSoft17 === 'H17' ? 2 : 3
    if (dk >= doubleMin && dk <= 6) return 'double'
    if (dk === 7 || dk === 8) return 'stand'
    // S17: dk===2 falls here — stand instead of hit
    if (rules.dealerSoft17 === 'S17' && dk === 2) return 'stand'
    return 'hit'
  }
  if (score === 17) return dk >= 3 && dk <= 6 ? 'double' : 'hit'
  if (score === 16 || score === 15) return dk >= 4 && dk <= 6 ? 'double' : 'hit'
  if (score === 14 || score === 13) return dk >= 5 && dk <= 6 ? 'double' : 'hit'
  return 'hit'
}

// Hard totals
function getHardAction(score: number, dk: DealerKey): Action {
  if (score >= 17) return 'stand'
  if (score >= 13) return dk >= 2 && dk <= 6 ? 'stand' : 'hit'
  if (score === 12) return dk >= 4 && dk <= 6 ? 'stand' : 'hit'
  if (score === 11) return dk <= 10 ? 'double' : 'hit'
  if (score === 10) return dk >= 2 && dk <= 9 ? 'double' : 'hit'
  if (score === 9) return dk >= 3 && dk <= 6 ? 'double' : 'hit'
  return 'hit'
}

/** Which moves the player can make right now (rules, cards, split hands and balance all considered). */
export type AllowedMoves = { double: boolean; split: boolean; surrender: boolean; /** default true */ hit?: boolean }
const ALL_MOVES: AllowedMoves = { double: true, split: true, surrender: true }

/**
 * The basic strategy play for this hand, given only moves that are `allowed`. A pair that can't be split is played
 * as its total; when doubling isn't allowed, soft 18 and 19 fall back to Stand ("double, else stand") and every other
 * double to Hit.
 */
export function getOptimalAction(
  playerHand: Card[],
  dealerUpcard: Card,
  rules: TableRules,
  allowed: AllowedMoves = ALL_MOVES,
): Action {
  const dk = dealerKey(dealerUpcard)
  const score = scoreHand(playerHand)
  const soft = isSoft(playerHand)

  // Early surrender comes first: it is decided before anything else, even splitting 8s.
  if (allowed.surrender && rules.surrender === 'early' && canSurrender(playerHand, rules)
    && isEarlySurrender(score, soft, dk)) return 'surrender'

  // Always-split pairs take priority over (late) surrender
  if (allowed.split && canSplit(playerHand)) {
    const v = playerHand[0].value
    if (v === 'A' || v === '8') return 'split'
  }

  const surrender = allowed.surrender ? getSurrenderAction(score, dk, rules) : null
  if (surrender && canSurrender(playerHand, rules)) return surrender

  const split = allowed.split ? getSplitAction(playerHand, dk) : null
  if (split) return split

  let action = soft ? getSoftAction(score, dk, rules) : getHardAction(score, dk)
  if (action === 'double' && !allowed.double) action = soft && score >= 18 ? 'stand' : 'hit'
  // A hand that can't take cards (a split ace) can only stand.
  if (action === 'hit' && allowed.hit === false) action = 'stand'
  return action
}
