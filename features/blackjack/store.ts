import { create } from 'zustand'

const DEAL_DELAY = 350
let pendingStepIds: ReturnType<typeof setTimeout>[] = []
// Jumps the running animation (deal, split or dealer reveal) straight to its end state.
// Each finisher clears this before doing its work, so it can run at most once.
let pendingFinish: (() => void) | null = null
function scheduleStep(fn: () => void, ms: number) {
  pendingStepIds.push(setTimeout(fn, ms))
}
function cancelPendingSteps() {
  pendingStepIds.forEach(clearTimeout)
  pendingStepIds = []
  pendingFinish = null
}
// Cancels the remaining animation steps and applies the animation's end state now
function finishPendingSteps() {
  const finish = pendingFinish
  cancelPendingSteps()
  finish?.()
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
  abandonHand: () => void
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

type Store = BlackjackState & BlackjackActions
type SetState = (partial: Partial<Store>) => void

// Dealer plays out, every hand settles on its own stake and the round is recorded once.
// Animated: dealer cards are revealed one at a time and the result lands after the last one.
function settleRound(get: () => Store, set: SetState, animate: boolean) {
  const { deck, dealerHand, playerHands, handBets, tableRules } = get()
  const { deck: newDeck, dealerHand: fullDealerHand } = runDealer(deck, dealerHand, playerHands, tableRules)

  const outcomes: Array<{ outcome: Outcome; delta: number }> = playerHands.map((h, i) =>
    resolveHand(h, fullDealerHand, handBets[i], tableRules)
  )
  const totalDelta = outcomes.reduce((sum, r) => sum + r.delta, 0)
  const priority: Outcome[] = ['blackjack', 'win', 'push', 'lose', 'bust']
  const lastOutcome = priority.find(p => outcomes.some(r => r.outcome === p)) ?? 'lose'

  const finish = () => {
    pendingFinish = null
    useProfileStore.getState().recordHands(
      'blackjack',
      outcomes.map(r => ({ result: classifyBlackjack(r.outcome), delta: r.delta })),
    )
    set({ dealerHand: fullDealerHand, phase: 'result', lastOutcome, lastDelta: totalDelta })
  }

  cancelPendingSteps()
  set({ deck: newDeck, phase: 'dealing' })
  if (!animate) {
    finish()
    return
  }
  const D = DEAL_DELAY
  for (let i = 2; i <= fullDealerHand.length; i++) {
    const cards = fullDealerHand.slice(0, i)
    scheduleStep(() => set({ dealerHand: cards }), D * (i - 1))
  }
  scheduleStep(finish, D * fullDealerHand.length)
  pendingFinish = finish
}

export const useBlackjackStore = create<Store>((set, get) => ({
  ...initialState,

  getInitialState: () => initialState,

  setTableRules: (rules) => {
    cancelPendingSteps()
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
    const { handBets, activeHandIndex } = get()
    const total = handBets.reduce((a, b) => a + b, 0)
    return total + handBets[activeHandIndex] <= profile.balance
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
    const finishDeal = () => {
      pendingFinish = null
      const { assistEnabled, handBets } = get()
      const playerHands = [[c1, c3]]
      // Dealer peek: a dealer natural ends the hand before the player acts
      if (isBlackjack([c2, c4])) {
        const revealed = [c2, { ...c4, faceDown: false }]
        const { outcome, delta } = resolveHand(playerHands[0], revealed, handBets[0], tableRules)
        useProfileStore.getState().recordHands('blackjack', [{ result: classifyBlackjack(outcome), delta }])
        set({ playerHands, dealerHand: revealed, phase: 'result', lastOutcome: outcome, lastDelta: delta, suggestedAction: null })
        return
      }
      const dealerHand = [c2, { ...c4, faceDown: true }]
      const suggestedAction = computeSuggestion(playerHands, 0, dealerHand, assistEnabled, tableRules)
      set({ playerHands, dealerHand, phase: 'playing', suggestedAction })
      if (scoreHand(playerHands[0]) === 21 && playerHands[0].length === 2) {
        get().stand()
      }
    }
    scheduleStep(finishDeal, D * 4)
    pendingFinish = finishDeal
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
    // All hands done — dealer plays out, cards revealed one at a time
    settleRound(get, set, true)
  },

  doubleDown: () => {
    if (!get().canAffordExtra()) return
    let { deck, playerHands, activeHandIndex, handBets } = get()
    let card: Card
    ;[card, deck] = dealCard(deck)
    const newHands = playerHands.map((h, i) => i === activeHandIndex ? [...h, card] : h)
    set({ deck, playerHands: newHands, handBets: handBets.map((b, i) => i === activeHandIndex ? b * 2 : b) })
    // Force stand after doubling
    get().stand()
  },

  split: () => {
    const { phase, playerHands, activeHandIndex } = get()
    if (phase !== 'playing') return
    const hand = playerHands[activeHandIndex]
    if (!canSplit(hand)) return
    if (!get().canAffordExtra()) return
    let { deck, handBets } = get()
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
      handBets: [...handBets.slice(0, activeHandIndex + 1), handBets[activeHandIndex], ...handBets.slice(activeHandIndex + 1)],
      phase: 'dealing',
    })

    const D = DEAL_DELAY
    scheduleStep(() => {
      set(s => ({ playerHands: s.playerHands.map((h, i) => i === activeHandIndex ? [hand[0], c1] : h) }))
    }, D)
    const finishSplit = () => {
      pendingFinish = null
      const { assistEnabled, dealerHand, tableRules } = get()
      const newHands = get().playerHands.map((h, i) =>
        i === activeHandIndex ? [hand[0], c1] : i === activeHandIndex + 1 ? [hand[1], c2] : h)
      const suggestedAction = computeSuggestion(newHands, activeHandIndex, dealerHand, assistEnabled, tableRules)
      set({ playerHands: newHands, suggestedAction, phase: 'playing' })
    }
    scheduleStep(finishSplit, D * 2)
    pendingFinish = finishSplit
  },

  surrender: () => {
    const { phase, playerHands, activeHandIndex, tableRules } = get()
    if (phase !== 'playing') return
    // Surrender is only offered on the original two-card hand, never after a split
    if (playerHands.length > 1) return
    const hand = playerHands[activeHandIndex]
    if (!canSurrender(hand, tableRules)) return
    const delta = -Math.floor(get().handBets[activeHandIndex] / 2)
    useProfileStore.getState().recordHands('blackjack', [{ result: 'loss', delta }])
    set({ phase: 'result', lastOutcome: 'lose', lastDelta: delta })
  },

  newHand: () => {
    cancelPendingSteps()
    const { tableRules, deck, assistEnabled } = get()
    set({ ...initialState, tableRules, deck, assistEnabled })
  },

  // Leaving the table: a hand in progress stands where it is and settles now,
  // then the next visit starts fresh. Nothing is recorded in betting or result.
  abandonHand: () => {
    // Finish any deal/split animation first; a player natural may chain into a dealer reveal
    while (pendingFinish) finishPendingSteps()
    if (get().phase === 'playing') settleRound(get, set, false)
    get().newHand()
  },
}))
