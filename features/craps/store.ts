import { create } from 'zustand'
import { nanoid } from 'nanoid/non-secure'
import { ActiveBet, BetType, CrapsPhase, CrapsTableRules } from '../../lib/types'
import { resolveRoll, isValidBetForVariant, isValidBetForPhase, canRemoveBet } from './engine'
import { useProfileStore } from '../profile/store'

const DEFAULT_RULES: CrapsTableRules = { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false }

type CrapsState = {
  phase: CrapsPhase
  dice: [number, number] | null
  point: number | null
  bets: ActiveBet[]
  tableRules: CrapsTableRules
  assistEnabled: boolean
  lastRoll: ReturnType<typeof resolveRoll> | null
  lastDelta: number
}

type CrapsActions = {
  setTableRules(rules: CrapsTableRules): void
  roll(): void
  placeBet(type: BetType, amount: number, number?: number, hopDice?: [number, number]): void
  removeBet(id: string): void
  reduceBet(id: string, amount: number): void
  addOdds(betId: string, amount: number): void
  toggleWorking(betId: string): void
  toggleAssist(): void
}

const initialState: CrapsState = {
  phase: 'setup',
  dice: null,
  point: null,
  bets: [],
  tableRules: DEFAULT_RULES,
  assistEnabled: false,
  lastRoll: null,
  lastDelta: 0,
}

export const useCrapsStore = create<CrapsState & CrapsActions>((set, get) => ({
  ...initialState,

  setTableRules(rules) {
    set({ ...initialState, tableRules: rules, phase: 'come-out' })
  },

  toggleAssist() {
    set(s => ({ assistEnabled: !s.assistEnabled }))
  },

  placeBet(type, amount, number, hopDice) {
    const { phase, tableRules, bets } = get()
    if (!isValidBetForVariant(type, tableRules.variant)) return
    if (!isValidBetForPhase(type, phase)) return
    // Non-numbered bets (except hops) merge into the existing bet of the same type
    if (number == null && type !== 'hop-hard' && type !== 'hop-easy') {
      const existing = bets.find(b => b.type === type)
      if (existing) {
        set({ bets: bets.map(b => b.id === existing.id ? { ...b, amount: b.amount + amount } : b) })
        return
      }
    }
    const working = phase === 'point' || (type !== 'place' && type !== 'buy' && type !== 'lay')
    const bet: ActiveBet = { id: nanoid(), type, amount, number, hopDice, working }
    set({ bets: [...bets, bet] })
  },

  removeBet(id) {
    const { bets, phase } = get()
    const bet = bets.find(b => b.id === id)
    if (!bet || !canRemoveBet(bet, phase)) return
    set({ bets: bets.filter(b => b.id !== id) })
  },

  reduceBet(id, amount) {
    const { bets, phase } = get()
    const bet = bets.find(b => b.id === id)
    if (!bet || !canRemoveBet(bet, phase)) return
    const newAmount = bet.amount - amount
    if (newAmount <= 0) {
      set({ bets: bets.filter(b => b.id !== id) })
    } else {
      set({ bets: bets.map(b => b.id === id ? { ...b, amount: newAmount } : b) })
    }
  },

  addOdds(betId, amount) {
    set(s => ({ bets: s.bets.map(b => b.id === betId ? { ...b, odds: (b.odds ?? 0) + amount } : b) }))
  },

  toggleWorking(betId) {
    set(s => ({ bets: s.bets.map(b => b.id === betId ? { ...b, working: !b.working } : b) }))
  },

  roll() {
    const { phase, point, bets, tableRules } = get()
    if (phase === 'setup') return

    const dice: [number, number] = [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]
    const resolution = resolveRoll(dice, phase, point, bets, tableRules)

    const totalDelta = resolution.outcomes.reduce((sum, o) => sum + o.delta, 0)
    if (totalDelta !== 0) {
      useProfileStore.getState().updateBalance(totalDelta)
    }

    // Multi-roll bets stay on the table after winning — only removed on a loss
    const persistOnWin: ActiveBet['type'][] = ['place', 'buy', 'lay', 'big6', 'big8', 'hardway']

    let updatedBets = bets.map(bet => {
      const outcome = resolution.outcomes.find(o => o.betId === bet.id)
      if (!outcome) return bet
      const ext = outcome as any
      if (ext.newComePoint != null) return { ...bet, comePoint: ext.newComePoint }
      return bet
    }).filter(bet => {
      const outcome = resolution.outcomes.find(o => o.betId === bet.id)
      if (!outcome) return true
      if (outcome.result === 'continue') return true
      if (outcome.result === 'win' && persistOnWin.includes(bet.type)) return true
      return false
    })

    let nextPhase: CrapsPhase = phase
    let nextPoint = resolution.nextPoint

    if (resolution.phaseChange === 'point-set') {
      nextPhase = 'point'
      updatedBets = updatedBets.map(b =>
        (b.type === 'place' || b.type === 'buy' || b.type === 'lay') && !b.working
          ? { ...b, working: true }
          : b
      )
    } else if (resolution.phaseChange === 'natural' || resolution.phaseChange === 'craps' ||
               resolution.phaseChange === 'point-made' || resolution.phaseChange === 'seven-out') {
      nextPhase = 'come-out'
      updatedBets = updatedBets.map(b =>
        (b.type === 'place' || b.type === 'buy' || b.type === 'lay')
          ? { ...b, working: false }
          : b
      )
    }

    set({ dice, phase: nextPhase, point: nextPoint ?? null, bets: updatedBets, lastRoll: resolution, lastDelta: totalDelta })
  },
}))
