import { ActiveBet } from '../../lib/types'
import { oddsStep, oddsWin, placeStep, placeWin } from './engine'

/*
 * The payout assist: does a bet pay exactly, or does the casino round its win down? Place bets are checked on their
 * amount, line bets on their odds (taken or laid) at their own point. Steps and payouts are the engine's own.
 */

export type PayoutCheck = {
  kind: 'place' | 'odds' | 'lay'
  /** The Place number, or the point the odds are on. */
  number: number
  /** The amount checked: the Place bet, or the odds. */
  amount: number
  /** It pays exactly in multiples of this. */
  step: number
  exact: boolean
  /** The payout, e.g. "7 to 6". */
  ratio: string
}

const PLACE_RATIO: Record<number, string> = {
  4: '9 to 5', 10: '9 to 5', 5: '7 to 5', 9: '7 to 5', 6: '7 to 6', 8: '7 to 6',
  3: '13 to 5', 11: '13 to 5', 2: '5 to 1', 12: '5 to 1',
}
const ODDS_RATIO: Record<number, string> = {
  4: '2 to 1', 10: '2 to 1', 5: '3 to 2', 9: '3 to 2', 6: '6 to 5', 8: '6 to 5',
  3: '3 to 1', 11: '3 to 1', 2: '6 to 1', 12: '6 to 1',
}
const LAY_RATIO: Record<number, string> = {
  4: '1 to 2', 10: '1 to 2', 5: '2 to 3', 9: '2 to 3', 6: '5 to 6', 8: '5 to 6',
  3: '1 to 3', 11: '1 to 3', 2: '1 to 6', 12: '1 to 6',
}

/** What the assist checks on this bet, or null when there's nothing to size (no odds, no point, other bets). */
export function payoutCheck(bet: ActiveBet, point: number | null): PayoutCheck | null {
  if (bet.type === 'place' && bet.number != null) {
    const step = placeStep(bet.number)
    return { kind: 'place', number: bet.number, amount: bet.amount, step, exact: bet.amount % step === 0,
      ratio: PLACE_RATIO[bet.number] }
  }
  const isCome = bet.type === 'come' || bet.type === 'dont-come'
  if (!isCome && bet.type !== 'pass' && bet.type !== 'dont-pass') return null
  const at = isCome ? bet.comePoint : point
  const odds = bet.odds ?? 0
  if (at == null || odds <= 0) return null
  const lay = bet.type === 'dont-pass' || bet.type === 'dont-come'
  const step = oddsStep(at, lay)
  return { kind: lay ? 'lay' : 'odds', number: at, amount: odds, step, exact: odds % step === 0,
    ratio: (lay ? LAY_RATIO : ODDS_RATIO)[at] }
}

/** What `amount` wins on this bet, as the engine pays it (rounded down). */
export function payoutFor(check: PayoutCheck, amount: number): number {
  return check.kind === 'place' ? placeWin(amount, check.number) : oddsWin(amount, check.number, check.kind === 'lay')
}

/** The exact amounts either side of the checked one (below is null when it would be $0). */
export function nearbyExact(check: PayoutCheck): { below: number | null; above: number } {
  const below = Math.floor(check.amount / check.step) * check.step
  const above = Math.ceil(check.amount / check.step) * check.step
  return { below: below > 0 ? below : null, above: above === check.amount ? above + check.step : above }
}

/** The reason-line hint for an amount that doesn't pay exactly, e.g. "Place 6 pays 7 to 6: try $12 or $18". */
export function payoutHint(check: PayoutCheck): string | null {
  if (check.exact) return null
  const { below, above } = nearbyExact(check)
  const what = check.kind === 'place' ? `Place ${check.number} pays`
    : check.kind === 'odds' ? `Odds on ${check.number} pay` : `Lay odds on ${check.number} pay`
  return `${what} ${check.ratio}: try ${below != null ? `$${below} or ` : ''}$${above}`
}

/**
 * The amount the one-tap fix sets: the next exact amount up when the balance (`free`, what can still be added) and,
 * for odds, the `cap` allow it, else the one below. Null when it already pays exactly or neither works.
 */
export function fixTarget(check: PayoutCheck, { cap, free }: { cap: number | null; free: number }): number | null {
  if (check.exact) return null
  const { below, above } = nearbyExact(check)
  if ((cap == null || above <= cap) && above - check.amount <= free) return above
  return below
}

/** The largest exact odds within the cap and what the balance can add to `current`; 0 when none fits. */
export function maxExactOdds(step: number, cap: number, current: number, free: number): number {
  return Math.floor(Math.min(cap, current + free) / step) * step
}
