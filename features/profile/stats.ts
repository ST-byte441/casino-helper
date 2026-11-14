import type { Outcome } from '../../lib/types'
import type {
  CrapsRecord, HandRecord, HandResult, ProfileStats, Refill, SettledHand, SettledRoll,
} from './types'

const emptyHandRecord = (): HandRecord => ({ wins: 0, losses: 0, pushes: 0, biggestWin: 0, net: 0 })

export function emptyStats(): ProfileStats {
  return {
    blackjack: emptyHandRecord(),
    baccarat: emptyHandRecord(),
    roulette: emptyHandRecord(),
    craps: { rolls: 0, pointsMade: 0, sevenOuts: 0, biggestWin: 0, net: 0, longestRoll: 0 },
  }
}

export function classifyBlackjack(o: Outcome): HandResult {
  if (o === 'blackjack' || o === 'win') return 'win'
  if (o === 'push') return 'push'
  return 'loss'
}

export function classifyNet(net: number): HandResult {
  return net > 0 ? 'win' : net < 0 ? 'loss' : 'push'
}

export function applyHands(r: HandRecord, hands: SettledHand[]): HandRecord {
  const next = { ...r }
  for (const h of hands) {
    if (h.result === 'win') next.wins += 1
    else if (h.result === 'loss') next.losses += 1
    else next.pushes += 1
    next.net += h.delta
    next.biggestWin = Math.max(next.biggestWin, h.delta)
  }
  return next
}

export function applyCrapsRoll(r: CrapsRecord, roll: SettledRoll): CrapsRecord {
  if (!roll.hadBets) return { ...r }
  return {
    rolls: r.rolls + 1,
    pointsMade: r.pointsMade + (roll.phaseChange === 'point-made' ? 1 : 0),
    sevenOuts: r.sevenOuts + (roll.phaseChange === 'seven-out' ? 1 : 0),
    biggestWin: Math.max(r.biggestWin, roll.delta),
    net: r.net + roll.delta,
    longestRoll: Math.max(r.longestRoll, roll.shooterRolls),
  }
}

export function winRate(r: HandRecord): number | null {
  const decided = r.wins + r.losses
  return decided === 0 ? null : r.wins / decided
}

export function gamesNet(s: ProfileStats): number {
  return s.blackjack.net + s.baccarat.net + s.craps.net + s.roulette.net
}

export function refillTotal(refills: Refill[]): number {
  return refills.reduce((sum, r) => sum + r.amount, 0)
}

export function parseAddAmount(text: string): number | null {
  const t = text.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n > 0 ? n : null
}
