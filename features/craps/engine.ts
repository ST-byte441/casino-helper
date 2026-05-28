import { ActiveBet, BetOutcome, BetType, CrapsPhase, CrapsTableRules, CrapsVariant, OddsMultiple, RollResolution } from '../../lib/types'

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

function oddsPayout(bet: ActiveBet, point: number): number {
  const odds = bet.odds ?? 0
  if (odds === 0) return 0
  if (bet.type === 'dont-pass' || bet.type === 'dont-come') {
    if (point === 6 || point === 8) return Math.floor(odds * 5 / 6)
    if (point === 5 || point === 9) return Math.floor(odds * 2 / 3)
    return Math.floor(odds / 2)
  }
  if (point === 6 || point === 8) return Math.floor(odds * 6 / 5)
  if (point === 5 || point === 9) return Math.floor(odds * 3 / 2)
  return odds * 2
}

function resolvePassBet(bet: ActiveBet, dice: [number, number], phase: CrapsPhase, point: number | null, rules: CrapsTableRules): BetOutcome {
  const sum = sumDice(dice)
  const isPass = bet.type === 'pass'

  if (phase === 'come-out') {
    const naturals = rules.variant === 'craps' ? [7, 11] : [7]
    const crapsNums = rules.variant === 'craps' ? [2, 3, 12] : []

    if (naturals.includes(sum)) {
      return { betId: bet.id, result: isPass ? 'win' : 'lose', delta: isPass ? bet.amount : -bet.amount }
    }
    if (crapsNums.includes(sum)) {
      if (sum === 12 && !isPass) return { betId: bet.id, result: 'push', delta: 0 }
      return { betId: bet.id, result: isPass ? 'lose' : 'win', delta: isPass ? -bet.amount : bet.amount }
    }
    return { betId: bet.id, result: 'continue', delta: 0 }
  }

  // point phase
  if (sum === point) {
    const op = oddsPayout(bet, point!)
    const flat = bet.amount
    return { betId: bet.id, result: isPass ? 'win' : 'lose', delta: isPass ? flat + op : -(flat + (bet.odds ?? 0)) }
  }

  if (sum === 7) {
    const odds = bet.odds ?? 0
    const op = oddsPayout(bet, point!)
    return { betId: bet.id, result: isPass ? 'lose' : 'win', delta: isPass ? -(bet.amount + odds) : bet.amount + op }
  }

  return { betId: bet.id, result: 'continue', delta: 0 }
}

function resolvePlaceBet(bet: ActiveBet, dice: [number, number]): BetOutcome {
  if (!bet.working) return { betId: bet.id, result: 'continue', delta: 0 }
  const sum = sumDice(dice)
  if (sum === 7) return { betId: bet.id, result: 'lose', delta: -bet.amount }
  const targetNumber = bet.number ?? (bet.type === 'big6' ? 6 : bet.type === 'big8' ? 8 : undefined)
  if (sum !== targetNumber) return { betId: bet.id, result: 'continue', delta: 0 }

  const n = targetNumber!
  const amt = bet.amount
  let win: number
  if (bet.type === 'place') {
    if (n === 6 || n === 8) win = Math.floor(amt * 7 / 6)
    else if (n === 5 || n === 9) win = Math.floor(amt * 7 / 5)
    else if (n === 4 || n === 10) win = Math.floor(amt * 9 / 5)
    else if (n === 2 || n === 12) win = Math.floor(amt * 11 / 2)
    else win = Math.floor(amt * 11 / 4) // 3 or 11
  } else if (bet.type === 'buy') {
    let gross: number
    if (n === 4 || n === 10) gross = amt * 2
    else if (n === 5 || n === 9) gross = Math.floor(amt * 3 / 2)
    else if (n === 6 || n === 8) gross = Math.floor(amt * 6 / 5)
    else if (n === 2 || n === 12) gross = amt * 6
    else gross = amt * 3 // 3 or 11
    win = gross - Math.ceil(amt * 0.05)
  } else { // big6 / big8
    win = amt
  }
  return { betId: bet.id, result: 'win', delta: win }
}

function resolveLayBet(bet: ActiveBet, dice: [number, number]): BetOutcome {
  if (!bet.working) return { betId: bet.id, result: 'continue', delta: 0 }
  const sum = sumDice(dice)
  const n = bet.number!
  if (sum === 7) {
    const amt = bet.amount
    let gross: number
    if (n === 4 || n === 10) gross = Math.floor(amt / 2)
    else if (n === 5 || n === 9) gross = Math.floor(amt * 2 / 3)
    else gross = Math.floor(amt * 5 / 6)
    const win = gross - Math.ceil(amt * 0.05)
    return { betId: bet.id, result: 'win', delta: win }
  }
  if (sum === n) return { betId: bet.id, result: 'lose', delta: -bet.amount }
  return { betId: bet.id, result: 'continue', delta: 0 }
}

function resolveHardway(bet: ActiveBet, dice: [number, number]): BetOutcome {
  if (!bet.working) return { betId: bet.id, result: 'continue', delta: 0 }
  const sum = sumDice(dice)
  const n = bet.number!
  if (sum === 7) return { betId: bet.id, result: 'lose', delta: -bet.amount }
  if (sum === n) {
    if (isHardRoll(dice)) {
      const payout = (n === 6 || n === 8) ? 9 : 7
      return { betId: bet.id, result: 'win', delta: bet.amount * payout }
    }
    return { betId: bet.id, result: 'lose', delta: -bet.amount }
  }
  return { betId: bet.id, result: 'continue', delta: 0 }
}

function resolveComeBet(bet: ActiveBet, dice: [number, number], rules: CrapsTableRules): BetOutcome & { newComePoint?: number } {
  const sum = sumDice(dice)
  const isCome = bet.type === 'come'

  if (bet.comePoint == null) {
    const naturals = rules.variant === 'craps' ? [7, 11] : [7]
    const crapsNums = rules.variant === 'craps' ? [2, 3, 12] : []
    if (naturals.includes(sum)) {
      return { betId: bet.id, result: isCome ? 'win' : 'lose', delta: isCome ? bet.amount : -bet.amount }
    }
    if (crapsNums.includes(sum)) {
      if (sum === 12 && !isCome) return { betId: bet.id, result: 'push', delta: 0 }
      return { betId: bet.id, result: isCome ? 'lose' : 'win', delta: isCome ? -bet.amount : bet.amount }
    }
    return { betId: bet.id, result: 'continue', delta: 0, newComePoint: sum }
  }

  if (sum === bet.comePoint) {
    const op = oddsPayout({ ...bet, type: isCome ? 'pass' : 'dont-pass' }, bet.comePoint)
    return { betId: bet.id, result: isCome ? 'win' : 'lose', delta: isCome ? bet.amount + op : -(bet.amount + (bet.odds ?? 0)) }
  }
  if (sum === 7) {
    const odds = bet.odds ?? 0
    const op = oddsPayout({ ...bet, type: isCome ? 'dont-pass' : 'pass' }, bet.comePoint)
    return { betId: bet.id, result: isCome ? 'lose' : 'win', delta: isCome ? -(bet.amount + odds) : bet.amount + op }
  }
  return { betId: bet.id, result: 'continue', delta: 0 }
}

function resolveSingleRollBet(bet: ActiveBet, dice: [number, number], point: number | null, rules: CrapsTableRules): BetOutcome | null {
  const singleRollTypes: BetType[] = ['field', 'low-field', 'high-field', 'any-7', 'any-craps', 'craps-2', 'craps-3', 'yo-11', 'craps-12', 'hi-lo', 'ce', 'horn', 'world', 'hop-hard', 'hop-easy']
  if (!singleRollTypes.includes(bet.type)) return null
  if (!bet.working) return { betId: bet.id, result: 'continue', delta: 0 }
  const delta = calculatePayout(bet, dice, point, rules)
  return { betId: bet.id, result: delta > 0 ? 'win' : 'lose', delta }
}

export function resolveRoll(
  dice: [number, number],
  phase: CrapsPhase,
  point: number | null,
  bets: ActiveBet[],
  rules: CrapsTableRules
): RollResolution {
  const sum = sumDice(dice)
  const outcomes: Array<BetOutcome & { newComePoint?: number }> = []

  for (const bet of bets) {
    if (bet.type === 'pass' || bet.type === 'dont-pass') {
      outcomes.push(resolvePassBet(bet, dice, phase, point, rules))
    } else if (bet.type === 'come' || bet.type === 'dont-come') {
      outcomes.push(resolveComeBet(bet, dice, rules))
    } else if (bet.type === 'place' || bet.type === 'buy' || bet.type === 'big6' || bet.type === 'big8') {
      outcomes.push(resolvePlaceBet(bet, dice))
    } else if (bet.type === 'lay') {
      outcomes.push(resolveLayBet(bet, dice))
    } else if (bet.type === 'hardway') {
      outcomes.push(resolveHardway(bet, dice))
    } else {
      const sr = resolveSingleRollBet(bet, dice, point, rules)
      if (sr) outcomes.push(sr)
    }
  }

  let phaseChange: RollResolution['phaseChange']
  let nextPoint: number | null = point

  if (phase === 'come-out') {
    const naturals = rules.variant === 'craps' ? [7, 11] : [7]
    const crapsNums = rules.variant === 'craps' ? [2, 3, 12] : []
    if (naturals.includes(sum)) {
      phaseChange = 'natural'
      nextPoint = null
    } else if (crapsNums.includes(sum)) {
      phaseChange = 'craps'
      nextPoint = null
    } else {
      phaseChange = 'point-set'
      nextPoint = sum
    }
  } else {
    if (sum === point) {
      phaseChange = 'point-made'
      nextPoint = null
    } else if (sum === 7) {
      phaseChange = 'seven-out'
      nextPoint = null
    }
  }

  return { dice, outcomes, phaseChange, nextPoint }
}
