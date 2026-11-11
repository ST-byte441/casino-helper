import { create } from 'zustand'
import {
  Card, BaccaratBet, BaccaratOutcome, BaccaratPhase, BaccaratRevealMode, RevealStep,
} from '../../lib/types'
import {
  buildDeck, dealHands, isNatural, scoreHand, shouldPlayerDraw, shouldBankerDraw,
  resolveRound, calculateDeltas, baccaratValue,
} from './engine'
import { revealOrder } from './reveal'
import { useProfileStore } from '../profile/store'

type BaccaratState = {
  phase: BaccaratPhase
  playerHand: Card[]
  bankerHand: Card[]
  bets: Partial<Record<BaccaratBet, number>>
  deck: Card[]
  lastOutcome: BaccaratOutcome | null
  lastDeltas: Partial<Record<BaccaratBet, number>>
  lastNetDelta: number
  assistEnabled: boolean
  revealOrder: RevealStep[]
  revealedCount: number
  settled: boolean
  handRevealMode: BaccaratRevealMode
}

type BaccaratActions = {
  placeBet(bet: BaccaratBet, amount: number): void
  clearBets(): void
  deal(mode: BaccaratRevealMode): void
  revealNext(): void
  abandonHand(): void
  newHand(): void
  toggleAssist(): void
}

const initialState: BaccaratState = {
  phase: 'betting',
  playerHand: [],
  bankerHand: [],
  bets: {},
  deck: [],
  lastOutcome: null,
  lastDeltas: {},
  lastNetDelta: 0,
  assistEnabled: false,
  revealOrder: [],
  revealedCount: 0,
  settled: false,
  handRevealMode: 'squeeze',
}

function applyDelta(delta: number) {
  if (delta !== 0) useProfileStore.getState().updateBalance(delta)
}

export const useBaccaratStore = create<BaccaratState & BaccaratActions>((set, get) => ({
  ...initialState,
  deck: buildDeck(),

  placeBet(bet, amount) {
    if (get().phase !== 'betting') return
    const ps = useProfileStore.getState()
    const profile = ps.profiles.find(p => p.id === ps.activeProfileId)
    if (profile && profile.bankrollMode !== 'infinite') {
      const totalBets = Object.values(get().bets).reduce((s, v) => s + (v ?? 0), 0)
      if (totalBets + amount > profile.balance) return
    }
    set(s => ({ bets: { ...s.bets, [bet]: (s.bets[bet] ?? 0) + amount } }))
  },

  clearBets() {
    if (get().phase !== 'betting') return
    set({ bets: {} })
  },

  deal(mode) {
    const { deck: currentDeck, bets, phase } = get()
    if (phase !== 'betting') return
    const deck = currentDeck.length < 10 ? buildDeck() : currentDeck
    let { playerHand, bankerHand, deck: remaining } = dealHands(deck)

    if (!isNatural(playerHand) && !isNatural(bankerHand)) {
      const playerDrewThird = shouldPlayerDraw(scoreHand(playerHand))
      if (playerDrewThird) {
        const [card, ...rest] = remaining
        playerHand = [...playerHand, card]
        remaining = rest
      }
      const playerThirdCard = playerDrewThird ? baccaratValue(playerHand[2]) : undefined
      const bankerTotal = scoreHand(bankerHand)
      if (shouldBankerDraw(bankerTotal, playerDrewThird, playerThirdCard)) {
        const [card, ...rest] = remaining
        bankerHand = [...bankerHand, card]
        remaining = rest
      }
    }

    const outcome = resolveRound(playerHand, bankerHand)
    const deltas = calculateDeltas(bets, outcome, playerHand, bankerHand)
    const netDelta = Object.values(deltas).reduce((s, d) => s + (d ?? 0), 0)

    set({
      playerHand,
      bankerHand,
      deck: remaining,
      lastOutcome: outcome,
      lastDeltas: deltas,
      lastNetDelta: netDelta,
      revealOrder: revealOrder(playerHand, bankerHand),
      revealedCount: 0,
      settled: false,
      handRevealMode: mode,
      phase: 'revealing',
    })
  },

  revealNext() {
    const { phase, revealedCount, revealOrder: order, settled, lastNetDelta } = get()
    if (phase !== 'revealing') return
    const next = revealedCount + 1
    if (next < order.length) {
      set({ revealedCount: next })
      return
    }
    if (!settled) applyDelta(lastNetDelta)
    set({ revealedCount: order.length, settled: true, phase: 'result' })
  },

  abandonHand() {
    const { phase, settled, lastNetDelta } = get()
    if (phase === 'revealing' && !settled) {
      set({ settled: true })
      applyDelta(lastNetDelta)
    }
    get().newHand()
  },

  newHand() {
    const { deck, assistEnabled } = get()
    set({ ...initialState, deck, assistEnabled })
  },

  toggleAssist() {
    set(s => ({ assistEnabled: !s.assistEnabled }))
  },
}))
