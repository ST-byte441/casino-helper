import { create } from 'zustand'
import { Card, Action, Outcome, Phase, TableRules } from '../../lib/types'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'
import { canSplit, canSurrender, createDeck, dealCard, needsReshuffle, resolveHand, scoreHand, shouldDealerHit } from './engine'
import { getOptimalAction } from './strategy'
import { useProfileStore } from '../profile/store'

type BlackjackState = {
  deck: Card[]
  playerHands: Card[][]
  activeHandIndex: number
  dealerHand: Card[]
  bet: number
  tableRules: TableRules
  phase: Phase
  assistEnabled: boolean
  suggestedAction: Action | null
  lastOutcome: Outcome | null
  lastDelta: number
}

type BlackjackActions = {
  getInitialState: () => BlackjackState
  setTableRules: (rules: TableRules) => void
  toggleAssist: () => void
  placeBet: (amount: number) => void
  clearBet: () => void
  deal: () => void
  hit: () => void
  stand: () => void
  doubleDown: () => void
  split: () => void
  surrender: () => void
  newHand: () => void
}

const initialState: BlackjackState = {
  deck: [],
  playerHands: [[]],
  activeHandIndex: 0,
  dealerHand: [],
  bet: 0,
  tableRules: DEFAULT_TABLE_RULES,
  phase: 'betting',
  assistEnabled: false,
  suggestedAction: null,
  lastOutcome: null,
  lastDelta: 0,
}

function computeSuggestion(
  playerHands: Card[][],
  activeHandIndex: number,
  dealerHand: Card[],
  assistEnabled: boolean,
  tableRules: TableRules
): Action | null {
  if (!assistEnabled) return null
  const hand = playerHands[activeHandIndex]
  const upcard = dealerHand[0]
  if (!hand || hand.length < 2 || !upcard) return null
  return getOptimalAction(hand, upcard, tableRules)
}

function runDealer(deck: Card[], dealerHand: Card[], tableRules: TableRules): { deck: Card[]; dealerHand: Card[] } {
  let d = deck
  let hand = dealerHand.map(c => ({ ...c, faceDown: false }))
  while (shouldDealerHit(hand, tableRules)) {
    let card: Card
    ;[card, d] = dealCard(d)
    hand = [...hand, card]
  }
  return { deck: d, dealerHand: hand }
}

export const useBlackjackStore = create<BlackjackState & BlackjackActions>((set, get) => ({
  ...initialState,

  getInitialState: () => initialState,

  setTableRules: (rules) => {
    const deck = createDeck(rules.deckCount)
    set({ tableRules: rules, deck })
  },

  toggleAssist: () => {
    const { assistEnabled, playerHands, activeHandIndex, dealerHand, tableRules } = get()
    const newAssist = !assistEnabled
    const suggestedAction = computeSuggestion(playerHands, activeHandIndex, dealerHand, newAssist, tableRules)
    set({ assistEnabled: newAssist, suggestedAction })
  },

  placeBet: (amount) => set(s => ({ bet: s.bet + amount })),
  clearBet: () => set({ bet: 0 }),

  deal: () => {
    const { bet } = get()
    if (bet <= 0) return
    let { deck, tableRules } = get()
    if (needsReshuffle(deck, tableRules.deckCount)) deck = createDeck(tableRules.deckCount)

    let c1: Card, c2: Card, c3: Card, c4: Card
    ;[c1, deck] = dealCard(deck)
    ;[c2, deck] = dealCard(deck)
    ;[c3, deck] = dealCard(deck)
    ;[c4, deck] = dealCard(deck)

    const playerHands = [[c1, c3]]
    const dealerHand = [c2, { ...c4, faceDown: true }]
    const { assistEnabled } = get()
    const suggestedAction = computeSuggestion(playerHands, 0, dealerHand, assistEnabled, tableRules)

    set({ deck, playerHands, dealerHand, activeHandIndex: 0, phase: 'playing', suggestedAction })

    // Check for natural blackjack — resolve immediately
    const playerScore = scoreHand(playerHands[0])
    if (playerScore === 21 && playerHands[0].length === 2) {
      get().stand()
    }
  },

  hit: () => {
    let { deck, playerHands, activeHandIndex, tableRules, assistEnabled, dealerHand } = get()
    let card: Card
    ;[card, deck] = dealCard(deck)
    const newHands = playerHands.map((h, i) => i === activeHandIndex ? [...h, card] : h)
    const newScore = scoreHand(newHands[activeHandIndex])
    const suggestedAction = newScore <= 21
      ? computeSuggestion(newHands, activeHandIndex, dealerHand, assistEnabled, tableRules)
      : null
    set({ deck, playerHands: newHands, suggestedAction })
    // If busted, advance to next hand or run dealer (same logic as stand)
    if (newScore > 21) {
      get().stand()
    }
  },

  stand: () => {
    const { playerHands, activeHandIndex } = get()
    if (activeHandIndex < playerHands.length - 1) {
      const next = activeHandIndex + 1
      const { assistEnabled, dealerHand, tableRules } = get()
      const suggestedAction = computeSuggestion(playerHands, next, dealerHand, assistEnabled, tableRules)
      set({ activeHandIndex: next, suggestedAction })
      return
    }
    // All hands done — run dealer
    let { deck, dealerHand, bet, tableRules } = get()
    const { deck: newDeck, dealerHand: newDealerHand } = runDealer(deck, dealerHand, tableRules)

    const outcomes: Array<{ outcome: Outcome; delta: number }> = playerHands.map(h =>
      resolveHand(h, newDealerHand, bet, tableRules)
    )
    const totalDelta = outcomes.reduce((sum, r) => sum + r.delta, 0)
    const priority: Outcome[] = ['blackjack', 'win', 'push', 'lose', 'bust']
    const lastOutcome = priority.find(p => outcomes.some(r => r.outcome === p)) ?? 'lose'

    useProfileStore.getState().updateBalance(totalDelta)
    set({ deck: newDeck, dealerHand: newDealerHand, phase: 'result', lastOutcome, lastDelta: totalDelta })
  },

  doubleDown: () => {
    let { deck, playerHands, activeHandIndex, bet } = get()
    let card: Card
    ;[card, deck] = dealCard(deck)
    const newHands = playerHands.map((h, i) => i === activeHandIndex ? [...h, card] : h)
    set({ deck, playerHands: newHands, bet: bet * 2 })
    // Force stand after doubling
    get().stand()
  },

  split: () => {
    const { phase, playerHands, activeHandIndex } = get()
    if (phase !== 'playing') return
    const hand = playerHands[activeHandIndex]
    if (!canSplit(hand)) return
    let { deck } = get()
    let c1: Card, c2: Card
    ;[c1, deck] = dealCard(deck)
    ;[c2, deck] = dealCard(deck)
    const hand1 = [hand[0], c1]
    const hand2 = [hand[1], c2]
    const newHands = [
      ...playerHands.slice(0, activeHandIndex),
      hand1,
      hand2,
      ...playerHands.slice(activeHandIndex + 1),
    ]
    const { assistEnabled, dealerHand, tableRules } = get()
    const suggestedAction = computeSuggestion(newHands, activeHandIndex, dealerHand, assistEnabled, tableRules)
    set({ deck, playerHands: newHands, suggestedAction })
  },

  surrender: () => {
    const { phase, playerHands, activeHandIndex, tableRules } = get()
    if (phase !== 'playing') return
    const hand = playerHands[activeHandIndex]
    if (!canSurrender(hand, tableRules)) return
    const { bet } = get()
    const delta = -Math.floor(bet / 2)
    useProfileStore.getState().updateBalance(delta)
    set({ phase: 'result', lastOutcome: 'lose', lastDelta: delta })
  },

  newHand: () => {
    const { tableRules, deck } = get()
    set({ ...initialState, tableRules, deck })
  },
}))
