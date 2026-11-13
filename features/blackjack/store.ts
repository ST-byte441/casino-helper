import { create } from 'zustand'

const DEAL_DELAY = 350
let pendingStepIds: ReturnType<typeof setTimeout>[] = []
function scheduleStep(fn: () => void, ms: number) {
  pendingStepIds.push(setTimeout(fn, ms))
}
function cancelPendingSteps() {
  pendingStepIds.forEach(clearTimeout)
  pendingStepIds = []
}
import { Card, Action, Outcome, Phase, TableRules } from '../../lib/types'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'
import { canSplit, canSurrender, createDeck, dealCard, isBlackjack, needsReshuffle, resolveHand, scoreHand, shouldDealerHit } from './engine'
import { getOptimalAction } from './strategy'
import { useProfileStore } from '../profile/store'
import { classifyBlackjack } from '../profile/stats'

type BlackjackState = {
  deck: Card[]
  playerHands: Card[][]
  activeHandIndex: number
  dealerHand: Card[]
  bet: number
  handBets: number[]
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
  canAffordExtra: () => boolean
}

const initialState: BlackjackState = {
  deck: [],
  playerHands: [[]],
  activeHandIndex: 0,
  dealerHand: [],
  bet: 0,
  handBets: [],
  tableRules: DEFAULT_TABLE_RULES,
  phase: 'betting',
  assistEnabled: false,
  suggestedAction: null,
  lastOutcome: null,
  lastDelta: 0,
}

// Per-hand stakes; falls back to the base bet if handBets is not populated
function stakesFor(handBets: number[], playerHands: Card[][], bet: number): number[] {
  return playerHands.map((_, i) => handBets[i] ?? bet)
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
  const action = getOptimalAction(hand, upcard, tableRules)
  if (action === 'double') {
    if (hand.length > 2) return 'hit'
    if (playerHands.length > 1 && !tableRules.doubleAfterSplit) return 'hit'
  }
  return action
}

function runDealer(
  deck: Card[],
  dealerHand: Card[],
  playerHands: Card[][],
  tableRules: TableRules
): { deck: Card[]; dealerHand: Card[] } {
  let d = deck
  let hand = dealerHand.map(c => ({ ...c, faceDown: false }))
  // If the player has busted or holds a natural, the dealer just turns over the hole card
  const allBusted = playerHands.every(h => scoreHand(h) > 21)
  const playerNatural = playerHands.length === 1 && isBlackjack(playerHands[0])
  const dealerPlays = !allBusted && !playerNatural
  while (dealerPlays && shouldDealerHit(hand, tableRules)) {
    let card: Card
    ;[card, d] = dealCard(d)
    hand = [...hand, { ...card, faceDown: false }]
  }
  return { deck: d, dealerHand: hand }
}

export const useBlackjackStore = create<BlackjackState & BlackjackActions>((set, get) => ({
  ...initialState,

  getInitialState: () => initialState,

  setTableRules: (rules) => {
    const deck = createDeck(rules.deckCount)
    set({ ...initialState, tableRules: rules, deck })
  },

  toggleAssist: () => {
    const { assistEnabled, playerHands, activeHandIndex, dealerHand, tableRules } = get()
    const newAssist = !assistEnabled
    const suggestedAction = computeSuggestion(playerHands, activeHandIndex, dealerHand, newAssist, tableRules)
    set({ assistEnabled: newAssist, suggestedAction })
  },

  placeBet: (amount) => {
    const ps = useProfileStore.getState()
    const profile = ps.profiles.find(p => p.id === ps.activeProfileId)
    if (profile && profile.bankrollMode !== 'infinite') {
      if (get().bet + amount > profile.balance) return
    }
    set(s => ({ bet: s.bet + amount }))
  },
  clearBet: () => set({ bet: 0 }),

  canAffordExtra: () => {
    const ps = useProfileStore.getState()
    const profile = ps.profiles.find(p => p.id === ps.activeProfileId)
    if (!profile || profile.bankrollMode === 'infinite') return true
    const { handBets, playerHands, activeHandIndex, bet } = get()
    const stakes = stakesFor(handBets, playerHands, bet)
    const total = stakes.reduce((a, b) => a + b, 0)
    return total + (stakes[activeHandIndex] ?? bet) <= profile.balance
  },

  deal: () => {
    const { bet } = get()
    if (bet <= 0) return
    let { deck, tableRules } = get()
    if (tableRules.continuousShuffle || needsReshuffle(deck, tableRules.deckCount)) deck = createDeck(tableRules.deckCount)

    let c1: Card, c2: Card, c3: Card, c4: Card
    ;[c1, deck] = dealCard(deck)
    ;[c2, deck] = dealCard(deck)
    ;[c3, deck] = dealCard(deck)
    ;[c4, deck] = dealCard(deck)

    cancelPendingSteps()
    set({ deck, playerHands: [[]], handBets: [bet], dealerHand: [], activeHandIndex: 0, phase: 'dealing', suggestedAction: null })

    const D = DEAL_DELAY
    scheduleStep(() => set({ playerHands: [[c1]] }), D)
    scheduleStep(() => set({ dealerHand: [c2] }), D * 2)
    scheduleStep(() => set({ playerHands: [[c1, c3]] }), D * 3)
    scheduleStep(() => {
      const { assistEnabled } = get()
      const playerHands = [[c1, c3]]
      // Dealer peek: a dealer natural ends the hand before the player acts
      if (isBlackjack([c2, c4])) {
        const revealed = [c2, { ...c4, faceDown: false }]
        const { outcome, delta } = resolveHand(playerHands[0], revealed, bet, tableRules)
        useProfileStore.getState().recordHands('blackjack', [{ result: classifyBlackjack(outcome), delta }])
        set({ dealerHand: revealed, phase: 'result', lastOutcome: outcome, lastDelta: delta, suggestedAction: null })
        return
      }
      const dealerHand = [c2, { ...c4, faceDown: true }]
      const suggestedAction = computeSuggestion(playerHands, 0, dealerHand, assistEnabled, tableRules)
      set({ dealerHand, phase: 'playing', suggestedAction })
      if (scoreHand(playerHands[0]) === 21 && playerHands[0].length === 2) {
        get().stand()
      }
    }, D * 4)
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
    // All hands done — run dealer (pre-compute full hand, reveal cards one at a time)
    let { deck, dealerHand, bet, handBets, tableRules } = get()
    const stakes = stakesFor(handBets, playerHands, bet)
    const { deck: newDeck, dealerHand: fullDealerHand } = runDealer(deck, dealerHand, playerHands, tableRules)

    const outcomes: Array<{ outcome: Outcome; delta: number }> = playerHands.map((h, i) =>
      resolveHand(h, fullDealerHand, stakes[i], tableRules)
    )
    const totalDelta = outcomes.reduce((sum, r) => sum + r.delta, 0)
    const priority: Outcome[] = ['blackjack', 'win', 'push', 'lose', 'bust']
    const lastOutcome = priority.find(p => outcomes.some(r => r.outcome === p)) ?? 'lose'

    cancelPendingSteps()
    set({ deck: newDeck, phase: 'dealing' })

    const D = DEAL_DELAY
    for (let i = 2; i <= fullDealerHand.length; i++) {
      const cards = fullDealerHand.slice(0, i)
      scheduleStep(() => set({ dealerHand: cards }), D * (i - 1))
    }
    scheduleStep(() => {
      useProfileStore.getState().recordHands(
        'blackjack',
        outcomes.map(r => ({ result: classifyBlackjack(r.outcome), delta: r.delta })),
      )
      set({ phase: 'result', lastOutcome, lastDelta: totalDelta })
    }, D * fullDealerHand.length)
  },

  doubleDown: () => {
    if (!get().canAffordExtra()) return
    let { deck, playerHands, activeHandIndex, bet, handBets } = get()
    const stakes = stakesFor(handBets, playerHands, bet)
    let card: Card
    ;[card, deck] = dealCard(deck)
    const newHands = playerHands.map((h, i) => i === activeHandIndex ? [...h, card] : h)
    set({ deck, playerHands: newHands, handBets: stakes.map((b, i) => i === activeHandIndex ? b * 2 : b) })
    // Force stand after doubling
    get().stand()
  },

  split: () => {
    const { phase, playerHands, activeHandIndex } = get()
    if (phase !== 'playing') return
    const hand = playerHands[activeHandIndex]
    if (!canSplit(hand)) return
    if (!get().canAffordExtra()) return
    let { deck, handBets, bet } = get()
    const stakes = stakesFor(handBets, playerHands, bet)
    let c1: Card, c2: Card
    ;[c1, deck] = dealCard(deck)
    ;[c2, deck] = dealCard(deck)

    const baseHands = [
      ...playerHands.slice(0, activeHandIndex),
      [hand[0]],
      [hand[1]],
      ...playerHands.slice(activeHandIndex + 1),
    ]
    cancelPendingSteps()
    set({
      deck,
      playerHands: baseHands,
      handBets: [...stakes.slice(0, activeHandIndex + 1), stakes[activeHandIndex], ...stakes.slice(activeHandIndex + 1)],
      phase: 'dealing',
    })

    const D = DEAL_DELAY
    scheduleStep(() => {
      set(s => ({ playerHands: s.playerHands.map((h, i) => i === activeHandIndex ? [hand[0], c1] : h) }))
    }, D)
    scheduleStep(() => {
      const { assistEnabled, dealerHand, tableRules } = get()
      const newHands = get().playerHands.map((h, i) => i === activeHandIndex + 1 ? [hand[1], c2] : h)
      const suggestedAction = computeSuggestion(newHands, activeHandIndex, dealerHand, assistEnabled, tableRules)
      set({ playerHands: newHands, suggestedAction, phase: 'playing' })
    }, D * 2)
  },

  surrender: () => {
    const { phase, playerHands, activeHandIndex, tableRules } = get()
    if (phase !== 'playing') return
    // Surrender is only offered on the original two-card hand, never after a split
    if (playerHands.length > 1) return
    const hand = playerHands[activeHandIndex]
    if (!canSurrender(hand, tableRules)) return
    const { bet, handBets } = get()
    const delta = -Math.floor((handBets[activeHandIndex] ?? bet) / 2)
    useProfileStore.getState().recordHands('blackjack', [{ result: 'loss', delta }])
    set({ phase: 'result', lastOutcome: 'lose', lastDelta: delta })
  },

  newHand: () => {
    cancelPendingSteps()
    const { tableRules, deck, assistEnabled } = get()
    set({ ...initialState, tableRules, deck, assistEnabled })
  },
}))
