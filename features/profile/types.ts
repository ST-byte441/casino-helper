import type { RollResolution } from '../../lib/types'

export type BankrollMode = 'finite' | 'infinite'

export type GameId = 'blackjack' | 'baccarat' | 'craps'
export type HandResult = 'win' | 'loss' | 'push'
export type HandRecord = { wins: number; losses: number; pushes: number; biggestWin: number; net: number }
export type CrapsRecord = {
  rolls: number; pointsMade: number; sevenOuts: number; biggestWin: number; net: number
  longestRoll: number // most rolls one shooter survived (with the player betting) before a seven-out
}
export type ProfileStats = { blackjack: HandRecord; baccarat: HandRecord; craps: CrapsRecord }
export type Refill = { amount: number; at: number }
export type ProfilePicture = { kind: 'preset'; id: string } | { kind: 'upload'; uri: string }

export type Profile = {
  id: string
  name: string
  bankrollMode: BankrollMode
  balance: number
  createdAt: number
  startingBalance: number
  trackingSince: number
  refills: Refill[]
  stats: ProfileStats
  picture?: ProfilePicture
}

export type SettledHand = { result: HandResult; delta: number }
export type SettledRoll = {
  delta: number
  hadBets: boolean
  phaseChange?: RollResolution['phaseChange']
  shooterRolls: number // rolls the current shooter has survived so far (bet rolls only, seven-out excluded)
}
