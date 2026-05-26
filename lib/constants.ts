import { TableRules } from './types'

export const SUITS = ['♠', '♥', '♦', '♣'] as const
export const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'] as const

export const CHIP_DENOMINATIONS = [15, 25, 50] as const
export const TABLE_MINIMUM = 15

export const DEFAULT_TABLE_RULES: TableRules = {
  payoutMode: '3:2',
  dealerSoft17: 'H17',
  doubleAfterSplit: true,
  resplitAces: false,
  surrender: 'late',
  deckCount: 6,
}

export const RED_SUITS = ['♥', '♦'] as const
