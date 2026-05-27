export type Suit = '♠' | '♥' | '♦' | '♣'
export type Value = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export type Card = {
  suit: Suit
  value: Value
  faceDown?: boolean
}

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender'
export type Outcome = 'blackjack' | 'win' | 'lose' | 'push' | 'bust'
export type Phase = 'betting' | 'playing' | 'dealer' | 'result'

export type PayoutMode = '3:2' | '6:5'
export type SoftSeven = 'S17' | 'H17'
export type SurrenderMode = 'none' | 'late' | 'early'
export type DeckCount = 1 | 2 | 6 | 8

export type TableRules = {
  payoutMode: PayoutMode
  dealerSoft17: SoftSeven
  doubleAfterSplit: boolean
  resplitAces: boolean
  surrender: SurrenderMode
  deckCount: DeckCount
  continuousShuffle: boolean
}
