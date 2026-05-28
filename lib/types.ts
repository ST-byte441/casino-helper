export type Suit = '♠' | '♥' | '♦' | '♣'
export type Value = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export type Card = {
  suit: Suit
  value: Value
  faceDown?: boolean
}

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender'
export type Outcome = 'blackjack' | 'win' | 'lose' | 'push' | 'bust'
export type Phase = 'betting' | 'dealing' | 'playing' | 'dealer' | 'result'

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

export type CrapsVariant = 'craps' | 'crapless' | 'easy'
export type CrapsPhase = 'setup' | 'come-out' | 'point'
export type OddsMultiple = '1x' | '2x' | '3-4-5x' | '5x' | '10x'

export type CrapsTableRules = {
  variant: CrapsVariant
  oddsMultiple: OddsMultiple
  fieldPays3on12: boolean
}

export type BetType =
  | 'pass' | 'dont-pass'
  | 'come' | 'dont-come'
  | 'place' | 'buy' | 'lay'
  | 'big6' | 'big8'
  | 'field' | 'low-field' | 'high-field'
  | 'hardway'
  | 'any-7' | 'any-craps' | 'craps-2' | 'craps-3' | 'yo-11' | 'craps-12'
  | 'hi-lo' | 'ce' | 'horn' | 'world'
  | 'hop-hard' | 'hop-easy'

export type ActiveBet = {
  id: string
  type: BetType
  amount: number
  number?: number
  comePoint?: number
  odds?: number
  hopDice?: [number, number]
  working: boolean
}

export type BetOutcome = {
  betId: string
  result: 'win' | 'lose' | 'push' | 'continue'
  delta: number
}

export type RollResolution = {
  dice: [number, number]
  outcomes: BetOutcome[]
  phaseChange?: 'natural' | 'craps' | 'point-set' | 'point-made' | 'seven-out'
  nextPoint: number | null
}

export type BetQuality = 'optimal' | 'acceptable' | 'poor' | 'avoid'
