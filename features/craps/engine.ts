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
  // Come and Don't Come are made only after a point is set (rules doc: Come / Don't Come).
  if (betType === 'come' || betType === 'dont-come') return phase === 'point'
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
    // Crapless 2/12 pay 25 to 5 and 3/11 pay 13 to 5 (NGCB): $5 units pay exactly.
    if (number === 2 || number === 12) return 5
    if (number === 3 || number === 11) return 5
  }
  if (betType === 'buy' || betType === 'lay') return minBuyLayAmount(betType, number ?? 4)
  if (betType === 'horn') return 4
  if (betType === 'world') return 5
  return 1
}

export function getMaxOdds(passAmount: number, point: number, oddsMultiple: OddsMultiple): number {
  if (oddsMultiple === '1x') return passAmount
  if (oddsMultiple === '2x') return passAmount * 2
  if (oddsMultiple === '5x') return passAmount * 5
  if (oddsMultiple === '10x') return passAmount * 10
  // 3-4-5x: the max odds bet always pays 6x the line bet.
  if (point === 4 || point === 10) return passAmount * 3
  if (point === 5 || point === 9) return passAmount * 4
  // Crapless points (app; the sources don't cover them): keep the 6x max payout, so 1x at 6 to 1, 2x at 3 to 1.
  if (point === 2 || point === 12) return passAmount
  if (point === 3 || point === 11) return passAmount * 2
  return passAmount * 5 // 6 or 8
}

/** How many times the stake a winning lay pays, per number (reverse true odds). */
function layWinRatio(n: number): number {
  if (n === 4 || n === 10) return 1 / 2
  if (n === 5 || n === 9) return 2 / 3
  if (n === 6 || n === 8) return 5 / 6
  if (n === 3 || n === 11) return 1 / 3
  return 1 / 6 // 2 or 12
}

/**
 * Max lay odds behind Don't Pass / Don't Come. The cap is on the win: the lay may win as much as the Pass
 * odds cap would bet, so under 3-4-5x a don't player lays 6x the flat bet on every point.
 */
export function getMaxLayOdds(flatAmount: number, point: number, oddsMultiple: OddsMultiple): number {
  return Math.floor(getMaxOdds(flatAmount, point, oddsMultiple) / layWinRatio(point) + 1e-9)
}

/**
 * The most odds `bet` can carry, against its own point (the come point for Come / Don't Come, else the table
 * point); null when it takes no odds (not a line bet, or no point yet). The store and the table share this cap.
 */
export function oddsCap(bet: ActiveBet, point: number | null, oddsMultiple: OddsMultiple): number | null {
  const isCome = bet.type === 'come' || bet.type === 'dont-come'
  const isLine = isCome || bet.type === 'pass' || bet.type === 'dont-pass'
  const betPoint = isCome ? bet.comePoint : point
  if (!isLine || betPoint == null) return null
  return bet.type === 'dont-pass' || bet.type === 'dont-come'
    ? getMaxLayOdds(bet.amount, betPoint, oddsMultiple)
    : getMaxOdds(bet.amount, betPoint, oddsMultiple)
}

/**
 * Why `amount` on `type` (on top of any `existing` bet) can't be placed, or null when it can. Pure; the store adds
 * its own balance check.
 */
export function placementRefusal(
  type: BetType,
  amount: number,
  number: number | undefined,
  phase: CrapsPhase,
  variant: CrapsVariant,
  existing: ActiveBet | undefined,
): string | null {
  if (!isValidBetForVariant(type, variant)) return 'Not offered in this game'
  if (!isValidBetForPhase(type, phase)) {
    return type === 'come' || type === 'dont-come'
      ? 'Come bets open once a point is set'
      : 'Line bets are made on the come-out'
  }
  const total = (existing?.amount ?? 0) + amount
  if (type === 'buy' || type === 'lay') {
    const min = minBuyLayAmount(type, number ?? 4)
    if (total < min) return `Minimum ${type} is $${min}`
  }
  if (type === 'horn' && total % 4 !== 0) return 'Horn bets go in $4 units'
  if (type === 'world' && total % 5 !== 0) return 'World bets go in $5 units'
  return null
}

/**
 * Smallest Buy or Lay the table takes, so the $1 minimum vig never eats the whole win (rules doc: some casinos
 * require a $20 buy, or a lay that wins at least $20). Buy: $20. Lay: enough to win $20 at reverse true odds.
 */
export function minBuyLayAmount(betType: 'buy' | 'lay', number: number): number {
  if (betType === 'buy') return 20
  return Math.ceil(20 / layWinRatio(number) - 1e-9)
}

/** True when a place bet pays whole dollars at its payout (rules doc: Place Bets; crapless per the NGCB). */
/** True when a Place bet pays exactly (a multiple of placeStep). */
export function isCleanPlace(amount: number, n: number): boolean {
  return amount > 0 && amount % placeStep(n) === 0
}

/** True when taken odds pay exactly: 6/8 (6 to 5) in 5s, 5/9 (3 to 2) in 2s; 4/10 and crapless points always. */
export function isCleanOdds(oddsAmt: number, point: number): boolean {
  return oddsAmt > 0 && oddsAmt % oddsStep(point, false) === 0
}

/** True when laid odds pay exactly: 4/10 (1 to 2) in 2s, 5/9 and crapless 3/11 in 3s, 6/8 and crapless 2/12 in 6s. */
export function isCleanLayOdds(oddsAmt: number, point: number): boolean {
  return oddsAmt > 0 && oddsAmt % oddsStep(point, true) === 0
}

/** The 5% commission on a Buy or Lay, on the given base, rounded down to the dollar with a $1 minimum. */
function vig(base: number): number {
  return Math.max(1, Math.floor(base * 0.05))
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
    case 'ce': {
      // Half on Any Craps (7 to 1), half on 11 (15 to 1); the other half loses.
      const half = amount / 2
      if ([2, 3, 12].includes(sum)) return half * 7 - half // 3 to 1 on the whole bet
      if (sum === 11) return half * 15 - half // 7 to 1
      return -amount
    }
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
  return oddsWin(odds, point, bet.type === 'dont-pass' || bet.type === 'dont-come')
}

/** What odds of `odds` on `point` win, rounded down to the dollar: taken (Pass/Come) or laid (Don't). */
export function oddsWin(odds: number, point: number, lay: boolean): number {
  if (lay) return Math.floor(odds * layWinRatio(point) + 1e-9)
  if (point === 6 || point === 8) return Math.floor(odds * 6 / 5)
  if (point === 5 || point === 9) return Math.floor(odds * 3 / 2)
  if (point === 3 || point === 11) return odds * 3 // crapless (NGCB)
  if (point === 2 || point === 12) return odds * 6 // crapless (NGCB)
  return odds * 2
}

/** What a Place bet of `amt` on `n` wins, rounded down to the dollar. */
export function placeWin(amt: number, n: number): number {
  if (n === 6 || n === 8) return Math.floor(amt * 7 / 6)
  if (n === 5 || n === 9) return Math.floor(amt * 7 / 5)
  if (n === 4 || n === 10) return Math.floor(amt * 9 / 5)
  if (n === 2 || n === 12) return amt * 5 // crapless: 25 to 5 (NGCB)
  return Math.floor(amt * 13 / 5) // crapless 3 or 11: 13 to 5 (NGCB)
}

/** The step a Place bet on `n` pays exactly in (no rounding down): 7 to 6 in $6s, 9 to 5 / 7 to 5 / 13 to 5 in $5s. */
export function placeStep(n: number): number {
  if (n === 6 || n === 8) return 6
  if (n === 2 || n === 12) return 1
  return 5
}

/** The step odds on `point` pay exactly in. Taken: 6/8 in $5s, 5/9 in $2s, else $1. Laid: the win ratio's denominator. */
export function oddsStep(point: number, lay: boolean): number {
  if (lay) {
    if (point === 4 || point === 10) return 2
    if (point === 5 || point === 9 || point === 3 || point === 11) return 3
    return 6 // 6/8 (5 to 6), crapless 2/12 (1 to 6)
  }
  if (point === 6 || point === 8) return 5
  if (point === 5 || point === 9) return 2
  return 1
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
    win = placeWin(amt, n)
  } else if (bet.type === 'buy') {
    let gross: number
    if (n === 4 || n === 10) gross = amt * 2
    else if (n === 5 || n === 9) gross = Math.floor(amt * 3 / 2)
    else if (n === 6 || n === 8) gross = Math.floor(amt * 6 / 5)
    else if (n === 2 || n === 12) gross = amt * 6
    else gross = amt * 3 // 3 or 11
    win = gross - vig(amt) // 5% of the bet, taken on a win
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
    const gross = Math.floor(bet.amount * layWinRatio(n) + 1e-9)
    const win = gross - vig(gross) // 5% of the win, not the bet
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

function resolveComeBet(bet: ActiveBet, dice: [number, number], phase: CrapsPhase, rules: CrapsTableRules): BetOutcome & { newComePoint?: number } {
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

  // Come odds are off on the come-out: a decision then returns them (no win, no loss). Don't Come lay odds stay working.
  const oddsOff = isCome && phase === 'come-out'
  if (sum === bet.comePoint) {
    if (oddsOff) return { betId: bet.id, result: 'win', delta: bet.amount }
    const op = oddsPayout(bet, bet.comePoint)
    return { betId: bet.id, result: isCome ? 'win' : 'lose', delta: isCome ? bet.amount + op : -(bet.amount + (bet.odds ?? 0)) }
  }
  if (sum === 7) {
    if (oddsOff) return { betId: bet.id, result: 'lose', delta: -bet.amount }
    const odds = bet.odds ?? 0
    // The winner's own odds: true odds for Come, lay odds for Don't Come.
    const op = oddsPayout(bet, bet.comePoint)
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
      outcomes.push(resolveComeBet(bet, dice, phase, rules))
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
