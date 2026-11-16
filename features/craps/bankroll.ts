import { ActiveBet } from '../../lib/types'

/** Money on the table: every bet's stake plus its odds. */
export function atRisk(bets: ActiveBet[]): number {
  return bets.reduce((s, b) => s + b.amount + (b.odds ?? 0), 0)
}

/**
 * The balance the player sees: the settled bankroll less what is on the table, as on a digital craps machine.
 * The persisted balance stays the settled figure, so chips left down when the screen closes cost nothing.
 */
export function shownBalance(balance: number, bets: ActiveBet[]): number {
  return balance - atRisk(bets)
}
