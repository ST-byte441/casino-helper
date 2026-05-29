import { create } from 'zustand'
import { Card, BaccaratBet, BaccaratOutcome, BaccaratPhase } from '../../lib/types'
import {
  buildDeck, dealHands, isNatural, scoreHand, shouldPlayerDraw, shouldBankerDraw,
  resolveRound, calculateDeltas, baccaratValue,
} from './engine'
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
}

type BaccaratActions = {
  placeBet(bet: BaccaratBet, amount: number): void
  clearBets(): void
  deal(): void
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
}

export const useBaccaratStore = create<BaccaratState & BaccaratActions>((set, get) => ({
  ...initialState,
  deck: buildDeck(),

  placeBet(bet, amount) {
    if (get().phase !== 'betting') return
    set(s => ({ bets: { ...s.bets, [bet]: (s.bets[bet] ?? 0) + amount } }))
  },

  clearBets() {
    if (get().phase !== 'betting') return
    set({ bets: {} })
  },

  deal() {
    const { deck: currentDeck, bets } = get()
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

    if (netDelta !== 0) {
      useProfileStore.getState().updateBalance(netDelta)
    }

    set({
      playerHand,
      bankerHand,
      deck: remaining,
      lastOutcome: outcome,
      lastDeltas: deltas,
      lastNetDelta: netDelta,
      phase: 'result',
    })
  },

  newHand() {
    const { deck, assistEnabled } = get()
    set({ ...initialState, deck, assistEnabled })
  },

  toggleAssist() {
    set(s => ({ assistEnabled: !s.assistEnabled }))
  },
}))
