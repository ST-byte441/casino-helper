import { Suit, Value, TableRules } from './types'

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
export const VALUES: Value[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

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

export const RED_SUITS: Suit[] = ['♥', '♦']
