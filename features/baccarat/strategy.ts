import { BaccaratBet, BetQuality } from '../../lib/types'

export function getBaccaratBetQuality(bet: BaccaratBet): BetQuality {
  if (bet === 'banker') return 'optimal'
  if (bet === 'player') return 'acceptable'
  return 'avoid'
}
