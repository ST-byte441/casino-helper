import { BetQuality, BetType } from '../../lib/types'

export function getBetQuality(
  betType: BetType,
  hasOdds: boolean,
  oddsAtMax: boolean,
  number?: number
): BetQuality {
  if (betType === 'pass' || betType === 'come' || betType === 'dont-pass' || betType === 'dont-come') {
    return oddsAtMax ? 'optimal' : 'acceptable'
  }
  if (betType === 'place') {
    if (number === 6 || number === 8 || number == null) return 'acceptable'
    return 'poor'
  }
  if (betType === 'field' || betType === 'big6' || betType === 'big8') return 'poor'
  return 'avoid'
}
