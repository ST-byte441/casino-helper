import { ActiveBet, BetType } from '../../lib/types'
import { SpotKey } from './layout'

export type SpotAction =
  | { kind: 'place'; type: BetType; number?: number; units?: number; hopDice?: [number, number] }
  | { kind: 'odds'; betId: string }
  | { kind: 'none' }

// A chip on Horn is the amount per number: the screen places chip x units.
const HORN_UNITS = 4
const WORLD_UNITS = 5

const oddsFor = (type: 'pass' | 'dont-pass', bets: ActiveBet[], point: number | null): SpotAction => {
  const bet = bets.find(b => b.type === type)
  return bet && point != null ? { kind: 'odds', betId: bet.id } : { kind: 'none' }
}

export function spotAction(key: SpotKey, bets: ActiveBet[], point: number | null): SpotAction {
  if (key.startsWith('box:')) return { kind: 'place', type: 'place', number: Number(key.slice(4)) }
  if (key.startsWith('hard:')) return { kind: 'place', type: 'hardway', number: Number(key.slice(5)) }
  switch (key) {
    case 'pass-odds': return oddsFor('pass', bets, point)
    case 'dont-pass-odds': return oddsFor('dont-pass', bets, point)
    case 'horn': return { kind: 'place', type: 'horn', units: HORN_UNITS }
    default: return { kind: 'place', type: key as BetType }
  }
}

export function stackTapAction(bet: ActiveBet): SpotAction {
  if ((bet.type === 'come' || bet.type === 'dont-come') && bet.comePoint != null) {
    return { kind: 'odds', betId: bet.id }
  }
  if (bet.type === 'horn') return { kind: 'place', type: 'horn', units: HORN_UNITS }
  if (bet.type === 'world') return { kind: 'place', type: 'world', units: WORLD_UNITS }
  const action: SpotAction = { kind: 'place', type: bet.type }
  if (bet.number != null) action.number = bet.number
  if (bet.hopDice) action.hopDice = bet.hopDice
  return action
}
