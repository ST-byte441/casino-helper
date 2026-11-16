/**
 * The balance a game screen shows: the settled balance less the stake on the table, as on a casino machine.
 * Display only: the persisted balance moves only when a hand, spin or roll settles, so a stake left down when the
 * screen closes costs nothing. Null when there is no cap to show (infinite bankroll or no profile).
 */
export function shownBalanceFor(
  profile: { bankrollMode: 'finite' | 'infinite'; balance: number } | undefined,
  onTable: number,
): number | null {
  return profile && profile.bankrollMode !== 'infinite' ? profile.balance - onTable : null
}
