import { Card, BaccaratSide, RevealStep } from '../../lib/types'

/** Real dealing order: P1, B1, P2, B2, then P3 (if drawn), then B3 (if drawn). */
export function revealOrder(playerHand: Card[], bankerHand: Card[]): RevealStep[] {
  const order: RevealStep[] = [
    { side: 'player', index: 0 }, { side: 'banker', index: 0 },
    { side: 'player', index: 1 }, { side: 'banker', index: 1 },
  ]
  if (playerHand.length > 2) order.push({ side: 'player', index: 2 })
  if (bankerHand.length > 2) order.push({ side: 'banker', index: 2 })
  return order
}

/**
 * What one hand shows after `revealedCount` cards have been revealed.
 * `shown` includes the card currently being revealed (face-down in its slot);
 * the first two cards of each hand are always shown.
 */
export function handView(
  order: RevealStep[],
  revealedCount: number,
  side: BaccaratSide,
): { shown: number; faceUp: number } {
  let shown = 0
  let faceUp = 0
  order.forEach((step, i) => {
    if (step.side !== side) return
    if (i < revealedCount) faceUp++
    if (i <= revealedCount) shown++
  })
  const total = order.filter(s => s.side === side).length
  return { shown: Math.min(Math.max(shown, 2), total), faceUp }
}
