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
import { DEFAULT_TABLE_RULES, TABLE_MINIMUM } from '../../lib/constants'
import { canDouble, canSplit, canSurrender, createDeck, dealCard, isBlackjack, needsReshuffle, resolveHand, scoreHand, shouldDealerHit } from './engine'
import { AllowedMoves, getOptimalAction } from './strategy'
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
  /**
   * Early surrender: the dealer has blackjack, but checks only after the player decides. Surrender loses half; any
   * other move first settles the blackjack (the original bet lost) and isn't made.
   */
  peekPending: boolean
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
  /** Double is allowed on the active hand now: two cards, DAS after a split, and affordable. */
  canDoubleNow: () => boolean
  /** Hit is allowed on the active hand now (not on a split ace). */
  canHitNow: () => boolean
  /** Split is allowed on the active hand now: a pair, affordable, and a split ace only with resplitAces. */
  canSplitNow: () => boolean
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
  peekPending: false,
}

/** Whether the balance covers another stake the size of hand `index`'s (a double or a split). */
function affordsExtra(handBets: number[], index: number): boolean {
  const ps = useProfileStore.getState()
  const profile = ps.profiles.find(p => p.id === ps.activeProfileId)
  if (!profile || profile.bankrollMode === 'infinite') return true
  const total = handBets.reduce((a, b) => a + b, 0)
  return total + (handBets[index] ?? 0) <= profile.balance
}

/** A split ace: after a split, a hand whose first card (the pair card) is an ace. It gets one card only. */
function isSplitAceHand(playerHands: Card[][], index: number): boolean {
  return playerHands.length > 1 && playerHands[index]?.[0]?.value === 'A'
}

/**
 * What the player may do with hand `index` right now: double on two cards (after a split only with DAS) when
 * affordable, split when affordable, surrender only on the original hand. The Double button, doubleDown and Assist
 * all go by this, so Assist never suggests a move the buttons won't allow.
 */
function allowedMoves(playerHands: Card[][], index: number, handBets: number[], rules: TableRules): AllowedMoves {
  const hand = playerHands[index] ?? []
  const afford = affordsExtra(handBets, index)
  // Split aces get one card each: no hit or double, and a new ace splits again only with resplitAces.
  const splitAce = isSplitAceHand(playerHands, index)
  return {
    hit: !splitAce,
    double: !splitAce && canDouble(hand, playerHands.length > 1, rules) && afford,
    split: afford && (!splitAce || rules.resplitAces),
    surrender: playerHands.length === 1,
  }
}

function computeSuggestion(
  playerHands: Card[][],
  activeHandIndex: number,
  dealerHand: Card[],
  assistEnabled: boolean,
  tableRules: TableRules,
  handBets: number[],
): Action | null {
  if (!assistEnabled) return null
  const hand = playerHands[activeHandIndex]
  const upcard = dealerHand[0]
  if (!hand || hand.length < 2 || !upcard) return null
  return getOptimalAction(hand, upcard, tableRules, allowedMoves(playerHands, activeHandIndex, handBets, tableRules))
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

/** Money on the table: the bet while betting, every hand's stake (doubles and splits too) until the round settles. */
export function stakeOnTable(s: Pick<BlackjackState, 'phase' | 'bet' | 'handBets'>): number {
  if (s.phase === 'betting') return s.bet
  if (s.phase === 'result') return 0
  return s.handBets.reduce((a, b) => a + b, 0)
}

/**
 * The bet left on the table for the next hand: the last original bet, capped at the balance (`null` = infinite
 * bankroll or no profile), and dropped to 0 when what's left is under the table minimum.
 */
export function carriedBet(lastBet: number, balance: number | null): number {
  const bet = balance === null ? lastBet : Math.min(lastBet, balance)
  return bet < TABLE_MINIMUM ? 0 : bet
}

type Store = BlackjackState & BlackjackActions
type SetState = (partial: Partial<Store>) => void

/**
 * Early surrender's deferred dealer check: when one is pending, shows the hole card and settles the dealer's
 * blackjack (the player loses the original bet, or pushes a blackjack). Returns true when it ended the hand, so the
 * move that triggered it is not made.
 */
function settlePendingPeek(get: () => Store, set: SetState): boolean {
  const { peekPending, playerHands, dealerHand, handBets, tableRules } = get()
  if (!peekPending) return false
  const revealed = dealerHand.map(c => ({ ...c, faceDown: false }))
  const { outcome, delta } = resolveHand(playerHands[0], revealed, handBets[0], tableRules)
  useProfileStore.getState().recordHands('blackjack', [{ result: classifyBlackjack(outcome), delta }])
  set({ dealerHand: revealed, phase: 'result', lastOutcome: outcome, lastDelta: delta, suggestedAction: null,
    peekPending: false })
  return true
}

// Dealer plays out, every hand settles on its own stake and the round is recorded once.
// Animated: dealer cards are revealed one at a time and the result lands after the last one.
function settleRound(get: () => Store, set: SetState, animate: boolean) {
  const { deck, dealerHand, playerHands, handBets, tableRules } = get()
  const { deck: newDeck, dealerHand: fullDealerHand } = runDealer(deck, dealerHand, playerHands, tableRules)

  const split = playerHands.length > 1
  const outcomes: Array<{ outcome: Outcome; delta: number }> = playerHands.map((h, i) =>
    resolveHand(h, fullDealerHand, handBets[i], tableRules, split)
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
    const suggestedAction = computeSuggestion(playerHands, activeHandIndex, dealerHand, newAssist, tableRules, get().handBets)
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
    const { handBets, activeHandIndex } = get()
    return affordsExtra(handBets, activeHandIndex)
  },

  canDoubleNow: () => {
    const { phase, playerHands, activeHandIndex, handBets, tableRules } = get()
    return phase === 'playing' && allowedMoves(playerHands, activeHandIndex, handBets, tableRules).double
  },

  canHitNow: () => {
    const { phase, playerHands, activeHandIndex, handBets, tableRules } = get()
    return phase === 'playing' && allowedMoves(playerHands, activeHandIndex, handBets, tableRules).hit !== false
  },

  canSplitNow: () => {
    const { phase, playerHands, activeHandIndex, handBets, tableRules } = get()
    return phase === 'playing' && canSplit(playerHands[activeHandIndex] ?? [])
      && allowedMoves(playerHands, activeHandIndex, handBets, tableRules).split
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
      // Early surrender: with a dealer blackjack (and none for the player), the player decides first; the check
      // comes with the next move (settlePendingPeek).
      if (isBlackjack([c2, c4]) && tableRules.surrender === 'early' && !isBlackjack(playerHands[0])) {
        const dealerHand = [c2, { ...c4, faceDown: true }]
        const suggestedAction = computeSuggestion(playerHands, 0, dealerHand, assistEnabled, tableRules, get().handBets)
        set({ playerHands, dealerHand, phase: 'playing', suggestedAction, peekPending: true })
        return
      }
      // Dealer peek: a dealer natural ends the hand before the player acts
      if (isBlackjack([c2, c4])) {
        const revealed = [c2, { ...c4, faceDown: false }]
        const { outcome, delta } = resolveHand(playerHands[0], revealed, handBets[0], tableRules)
        useProfileStore.getState().recordHands('blackjack', [{ result: classifyBlackjack(outcome), delta }])
        set({ playerHands, dealerHand: revealed, phase: 'result', lastOutcome: outcome, lastDelta: delta, suggestedAction: null })
        return
      }
      const dealerHand = [c2, { ...c4, faceDown: true }]
      const suggestedAction = computeSuggestion(playerHands, 0, dealerHand, assistEnabled, tableRules, get().handBets)
      set({ playerHands, dealerHand, phase: 'playing', suggestedAction })
      if (scoreHand(playerHands[0]) === 21 && playerHands[0].length === 2) {
        get().stand()
      }
    }
    scheduleStep(finishDeal, D * 4)
    pendingFinish = finishDeal
  },

  hit: () => {
    if (!get().canHitNow()) return
    if (settlePendingPeek(get, set)) return
    let { deck, playerHands, activeHandIndex, tableRules, assistEnabled, dealerHand } = get()
    let card: Card
    ;[card, deck] = dealCard(deck)
    const newHands = playerHands.map((h, i) => i === activeHandIndex ? [...h, card] : h)
    const newScore = scoreHand(newHands[activeHandIndex])
    const suggestedAction = newScore <= 21
      ? computeSuggestion(newHands, activeHandIndex, dealerHand, assistEnabled, tableRules, get().handBets)
      : null
    set({ deck, playerHands: newHands, suggestedAction })
    // If busted, advance to next hand or run dealer (same logic as stand)
    if (newScore > 21) {
      get().stand()
    }
  },

  stand: () => {
    if (settlePendingPeek(get, set)) return
    const { playerHands, activeHandIndex } = get()
    if (activeHandIndex < playerHands.length - 1) {
      const next = activeHandIndex + 1
      const { assistEnabled, dealerHand, tableRules } = get()
      const suggestedAction = computeSuggestion(playerHands, next, dealerHand, assistEnabled, tableRules, get().handBets)
      set({ activeHandIndex: next, suggestedAction })
      // A split ace that can't be split again has its one card: it stands at once.
      if (isSplitAceHand(playerHands, next) && !get().canSplitNow()) get().stand()
      return
    }
    // All hands done — dealer plays out, cards revealed one at a time
    settleRound(get, set, true)
  },

  doubleDown: () => {
    if (!get().canDoubleNow()) return
    if (settlePendingPeek(get, set)) return
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
    if (!get().canSplitNow()) return
    if (settlePendingPeek(get, set)) return
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
      const suggestedAction = computeSuggestion(newHands, activeHandIndex, dealerHand, assistEnabled, tableRules, get().handBets)
      set({ playerHands: newHands, suggestedAction, phase: 'playing' })
      // Split aces get one card each: unless it can split again, the hand stands (and so on down the hands).
      if (isSplitAceHand(newHands, activeHandIndex) && !get().canSplitNow()) get().stand()
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
    // Early surrender before the dealer's check: show the blackjack it avoided.
    const dealerHand = get().peekPending ? get().dealerHand.map(c => ({ ...c, faceDown: false })) : get().dealerHand
    set({ phase: 'result', lastOutcome: 'lose', lastDelta: delta, dealerHand, peekPending: false })
  },

  // The last hand's original bet stays on the table (like chips left in the circle), capped at the settled balance.
  newHand: () => {
    cancelPendingSteps()
    const { tableRules, deck, assistEnabled, bet } = get()
    const ps = useProfileStore.getState()
    const profile = ps.profiles.find(p => p.id === ps.activeProfileId)
    const balance = profile && profile.bankrollMode !== 'infinite' ? profile.balance : null
    set({ ...initialState, tableRules, deck, assistEnabled, bet: carriedBet(bet, balance) })
  },

  // Leaving the table: a hand in progress stands where it is and settles now,
  // then the next visit starts fresh at $0. Nothing is recorded in betting or result.
  abandonHand: () => {
    // Finish any deal/split animation first; a player natural may chain into a dealer reveal
    while (pendingFinish) finishPendingSteps()
    if (get().phase === 'playing') settleRound(get, set, false)
    get().newHand()
    set({ bet: 0 })
  },
}))
