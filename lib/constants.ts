import { TableRules } from './types'

export const SUITS = ['♠', '♥', '♦', '♣'] as const
export const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'] as const

export const CHIP_DENOMINATIONS = [15, 25, 50] as const
export const TABLE_MINIMUM = 15

// Baccarat: Player/Banker use the main chips; Tie and the pairs use the smaller side chips.
export const BACCARAT_CHIPS = [15, 25, 50, 100] as const
export const BACCARAT_SIDE_CHIPS = [1, 5, 10, 25] as const
export const BACCARAT_MIN_MAIN_BET = 15

export const DEFAULT_TABLE_RULES: TableRules = {
  payoutMode: '3:2',
  dealerSoft17: 'H17',
  doubleAfterSplit: true,
  resplitAces: false,
  surrender: 'late',
  deckCount: 6,
  continuousShuffle: false,
}

export const RED_SUITS: readonly string[] = ['♥', '♦']

export const ROULETTE_CHIPS = [1, 5, 25, 100] as const
export const ROULETTE_TABLE_MIN = 10
