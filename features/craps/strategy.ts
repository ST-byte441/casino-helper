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
    // Crapless place 2/12 (25 to 5, 14.29%) and 3/11 (13 to 5, 10%): rules doc, NGCB.
    if (number === 2 || number === 3 || number === 11 || number === 12) return 'avoid'
    return 'poor'
  }
  // Buy and Lay with the vig taken only on a win: 1.67%-2.27% house edge (rules doc, Wikipedia).
  if (betType === 'buy' || betType === 'lay') return 'acceptable'
  if (betType === 'field' || betType === 'big6' || betType === 'big8') return 'poor'
  return 'avoid'
}
