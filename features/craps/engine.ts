import { ActiveBet, BetType, CrapsPhase, CrapsVariant, OddsMultiple } from '../../lib/types'

export function rollDice(): [number, number] {
  return [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]
}

export function sumDice(dice: [number, number]): number {
  return dice[0] + dice[1]
}

export function isHardRoll(dice: [number, number]): boolean {
  return dice[0] === dice[1]
}

export function isValidBetForVariant(betType: BetType, variant: CrapsVariant): boolean {
  if (betType === 'dont-pass' || betType === 'dont-come') return variant === 'craps'
  if (betType === 'come') return variant !== 'easy'
  if (betType === 'buy' || betType === 'lay') return variant !== 'easy'
  if (betType === 'big6' || betType === 'big8') return variant !== 'easy'
  if (betType === 'low-field' || betType === 'high-field') return variant === 'easy'
  return true
}

export function isValidBetForPhase(betType: BetType, phase: CrapsPhase): boolean {
  if (betType === 'pass' || betType === 'dont-pass') return phase === 'come-out'
  return true
}

export function canRemoveBet(bet: ActiveBet, phase: CrapsPhase): boolean {
  if (bet.type === 'pass' && phase === 'point') return false
  if (bet.type === 'come' && bet.comePoint != null) return false
  return true
}

export function suggestedBetIncrement(betType: BetType, number?: number): number {
  if (betType === 'place') {
    if (number === 6 || number === 8) return 6
    if (number === 5 || number === 9) return 5
    if (number === 4 || number === 10) return 5
    if (number === 2 || number === 12) return 2
    if (number === 3 || number === 11) return 4
  }
  if (betType === 'horn') return 4
  if (betType === 'world') return 5
  return 1
}

export function getMaxOdds(passAmount: number, point: number, oddsMultiple: OddsMultiple): number {
  if (oddsMultiple === '1x') return passAmount
  if (oddsMultiple === '2x') return passAmount * 2
  if (oddsMultiple === '5x') return passAmount * 5
  if (oddsMultiple === '10x') return passAmount * 10
  // 3-4-5x
  if (point === 4 || point === 10) return passAmount * 3
  if (point === 5 || point === 9) return passAmount * 4
  return passAmount * 5 // 6 or 8
}
