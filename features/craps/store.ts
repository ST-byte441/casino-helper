import { create } from 'zustand'
import { nanoid } from 'nanoid/non-secure'
import { ActiveBet, BetType, CrapsPhase, CrapsTableRules } from '../../lib/types'
import { resolveRoll, canRemoveBet, minBuyLayAmount, placementRefusal } from './engine'
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
  notice: string | null // why the last bet was refused; shown by the table
  selectedChip: number | null
  shooterRolls: number // rolls the current shooter has survived while the player had bets down
}

type CrapsActions = {
  setTableRules(rules: CrapsTableRules): void
  resetToSetup(): void
  roll(): void
  placeBet(type: BetType, amount: number, number?: number, hopDice?: [number, number]): boolean
  removeBet(id: string): void
  reduceBet(id: string, amount: number): void
  addOdds(betId: string, amount: number): boolean
  canAfford(amount: number): boolean
  toggleWorking(betId: string): void
  toggleAssist(): void
  selectChip(amount: number): void
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
  shooterRolls: 0,
  notice: null,
  selectedChip: null,
}

export const useCrapsStore = create<CrapsState & CrapsActions>((set, get) => ({
  ...initialState,

  setTableRules(rules) {
    set({ ...initialState, tableRules: rules, phase: 'come-out' })
  },

  resetToSetup() {
    const { tableRules, assistEnabled } = get()
    set({ ...initialState, tableRules, assistEnabled })
  },

  toggleAssist() {
    set(s => ({ assistEnabled: !s.assistEnabled }))
  },

  selectChip(amount) {
    set(s => ({ selectedChip: s.selectedChip === amount ? null : amount }))
  },

  placeBet(type, amount, number, hopDice) {
    const { phase, tableRules, bets } = get()
    // Buy/Lay minimum and Horn/World units count an existing bet toward the total.
    const stacked = bets.find(b => b.type === type && (number != null ? b.number === number : b.number == null))
    const refusal = placementRefusal(type, amount, number, phase, tableRules.variant, stacked)
    if (refusal) {
      set({ notice: refusal })
      return false
    }
    const ps = useProfileStore.getState()
    const profile = ps.profiles.find(p => p.id === ps.activeProfileId)
    if (profile && profile.bankrollMode !== 'infinite') {
      const totalBets = bets.reduce((s, b) => s + b.amount + (b.odds ?? 0), 0)
      if (totalBets + amount > profile.balance) {
        set({ notice: 'Not enough balance' })
        return false
      }
    }
    // Merge stackable bets: same type + same number (come/dont-come excluded — they track independent stages)
    const isMergeable = type !== 'hop-hard' && type !== 'hop-easy' && type !== 'come' && type !== 'dont-come'
    if (isMergeable) {
      const existing = bets.find(b =>
        b.type === type && (number != null ? b.number === number : b.number == null)
      )
      if (existing) {
        set({ bets: bets.map(b => b.id === existing.id ? { ...b, amount: b.amount + amount } : b), notice: null })
        return true
      }
    }
    // Place and Buy are off on the come-out; everything else (including Lay) works. Rules doc: Working and Not Working.
    const working = phase === 'point' || (type !== 'place' && type !== 'buy')
    const bet: ActiveBet = { id: nanoid(), type, amount, number, hopDice, working }
    set({ bets: [...bets, bet], notice: null })
    return true
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
    const belowMin = (bet.type === 'buy' || bet.type === 'lay') && newAmount < minBuyLayAmount(bet.type, bet.number ?? 4)
    if (newAmount <= 0 || belowMin) {
      set({ bets: bets.filter(b => b.id !== id) })
    } else {
      set({ bets: bets.map(b => b.id === id ? { ...b, amount: newAmount } : b) })
    }
  },

  canAfford(amount) {
    const ps = useProfileStore.getState()
    const profile = ps.profiles.find(p => p.id === ps.activeProfileId)
    if (!profile || profile.bankrollMode === 'infinite') return true
    const atRisk = get().bets.reduce((s, b) => s + b.amount + (b.odds ?? 0), 0)
    return atRisk + amount <= profile.balance
  },

  addOdds(betId, amount) {
    if (amount > 0 && !get().canAfford(amount)) {
      set({ notice: 'Not enough balance' })
      return false
    }
    set(s => ({ bets: s.bets.map(b => b.id === betId ? { ...b, odds: (b.odds ?? 0) + amount } : b), notice: null }))
    return true
  },

  toggleWorking(betId) {
    set(s => ({ bets: s.bets.map(b => b.id === betId ? { ...b, working: !b.working } : b) }))
  },

  roll() {
    const { phase, point, bets, tableRules, shooterRolls } = get()
    if (phase === 'setup') return

    const dice: [number, number] = [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]
    const resolution = resolveRoll(dice, phase, point, bets, tableRules)

    const totalDelta = resolution.outcomes.reduce((sum, o) => sum + o.delta, 0)
    const hadBets = bets.length > 0
    const sevenOut = resolution.phaseChange === 'seven-out'
    // The seven-out roll ends the shooter's run, so it doesn't count as a roll survived.
    const survived = hadBets && !sevenOut ? shooterRolls + 1 : shooterRolls
    useProfileStore.getState().recordCrapsRoll({
      delta: totalDelta,
      hadBets,
      phaseChange: resolution.phaseChange,
      shooterRolls: survived,
    })

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
        (b.type === 'place' || b.type === 'buy') && !b.working
          ? { ...b, working: true }
          : b
      )
    } else if (resolution.phaseChange === 'natural' || resolution.phaseChange === 'craps' ||
               resolution.phaseChange === 'point-made' || resolution.phaseChange === 'seven-out') {
      nextPhase = 'come-out'
      updatedBets = updatedBets.map(b =>
        (b.type === 'place' || b.type === 'buy')
          ? { ...b, working: false }
          : b
      )
    }

    set({
      dice, phase: nextPhase, point: nextPoint ?? null, bets: updatedBets, lastRoll: resolution, lastDelta: totalDelta, notice: null,
      shooterRolls: sevenOut ? 0 : survived,
    })
  },
}))
