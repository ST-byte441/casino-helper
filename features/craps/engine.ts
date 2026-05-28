import { ActiveBet, BetType, CrapsPhase, CrapsTableRules, CrapsVariant, OddsMultiple } from '../../lib/types'

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

export function calculatePayout(
  bet: ActiveBet,
  dice: [number, number],
  point: number | null,
  rules: CrapsTableRules
): number {
  const sum = sumDice(dice)
  const { amount } = bet

  switch (bet.type) {
    case 'field': {
      if ([3, 4, 9, 10, 11].includes(sum)) return amount
      if (sum === 2) return amount * 2
      if (sum === 12) return rules.fieldPays3on12 ? amount * 3 : amount * 2
      return -amount
    }
    case 'low-field':
      return [2, 3, 4].includes(sum) ? amount * 2 : -amount
    case 'high-field':
      return [10, 11, 12].includes(sum) ? amount * 3 : -amount
    case 'any-7':
      return sum === 7 ? amount * 4 : -amount
    case 'any-craps':
      return [2, 3, 12].includes(sum) ? amount * 7 : -amount
    case 'craps-2':
      return sum === 2 ? amount * 30 : -amount
    case 'craps-3':
      return sum === 3 ? amount * 15 : -amount
    case 'yo-11':
      return sum === 11 ? amount * 15 : -amount
    case 'craps-12':
      return sum === 12 ? amount * 30 : -amount
    case 'hi-lo':
      return (sum === 2 || sum === 12) ? amount * 15 : -amount
    case 'ce':
      if ([2, 3, 12].includes(sum)) return amount * 7
      if (sum === 11) return amount * 3
      return -amount
    case 'hop-hard': {
      const [h1, h2] = bet.hopDice!
      return (dice[0] === h1 && dice[1] === h2) ? amount * 30 : -amount
    }
    case 'hop-easy': {
      const [h1, h2] = bet.hopDice!
      const hit = (dice[0] === h1 && dice[1] === h2) || (dice[0] === h2 && dice[1] === h1)
      return hit ? amount * 15 : -amount
    }
    case 'horn': {
      const unit = amount / 4
      if (sum === 2 || sum === 12) return unit * 30 - unit * 3
      if (sum === 3 || sum === 11) return unit * 15 - unit * 3
      return -amount
    }
    case 'world': {
      const unit = amount / 5
      if (sum === 2 || sum === 12) return unit * 30 - unit * 4
      if (sum === 3 || sum === 11) return unit * 15 - unit * 4
      if (sum === 7) return 0
      return -amount
    }
    default:
      return 0
  }
}
