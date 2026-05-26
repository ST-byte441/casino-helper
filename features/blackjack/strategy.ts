import { Card, Action, TableRules } from '../../lib/types'
import { scoreHand, isSoft, canSplit } from './engine'

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
function getSurrenderAction(score: number, dk: DealerKey, rules: TableRules): Action | null {
  if (rules.surrender === 'none') return null
  if (score === 16 && (dk === 9 || dk === 10 || dk === 11)) return 'surrender'
  if (score === 15 && dk === 10) return 'surrender'
  return null
}

// Pairs split table
function getSplitAction(hand: Card[], dk: DealerKey, rules: TableRules): Action | null {
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
function getSoftAction(score: number, dk: DealerKey): Action {
  // score is 13–18 (A-2 through A-7); 19+ always stand
  if (score >= 19) return 'stand'
  if (score === 18) {
    if (dk >= 2 && dk <= 6) return 'double'
    if (dk === 7 || dk === 8) return 'stand'
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

export function getOptimalAction(
  playerHand: Card[],
  dealerUpcard: Card,
  rules: TableRules
): Action {
  const dk = dealerKey(dealerUpcard)
  const score = scoreHand(playerHand)
  const soft = isSoft(playerHand)

  const surrender = getSurrenderAction(score, dk, rules)
  if (surrender) return surrender

  const split = getSplitAction(playerHand, dk, rules)
  if (split) return split

  if (soft) return getSoftAction(score, dk)
  return getHardAction(score, dk)
}
