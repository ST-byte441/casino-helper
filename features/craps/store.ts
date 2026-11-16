import { create } from 'zustand'
import { nanoid } from 'nanoid/non-secure'
import { ActiveBet, BetType, CrapsPhase, CrapsTableRules } from '../../lib/types'
import { resolveRoll, canRemoveBet, minBuyLayAmount, placementRefusal, oddsCap } from './engine'
import { useProfileStore } from '../profile/store'
import { shownBalance } from './bankroll'

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
  /**
   * Takes down every bet allowed (canRemoveBet) and the odds off contract bets (Pass on a point, Come on its number),
   * which stay up. Returns how many bets and odds came off; the notice says what stayed.
   */
  clearTable(): number
  /** Whether clearTable would take anything down. */
  canClear(): boolean
  reduceBet(id: string, amount: number): void
  addOdds(betId: string, amount: number): boolean
  canAfford(amount: number): boolean
  toggleWorking(betId: string): void
  toggleAssist(): void
  selectChip(amount: number): void
  setNotice(notice: string | null): void
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

  setNotice(notice) {
    set({ notice })
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
      if (amount > shownBalance(profile.balance, bets)) {
        set({ notice: 'Not enough balance' })
        return false
      }
    }
    // Merge stackable bets: same type + same number. A Come / Don't Come merges only with one of its type still
    // in the Come box (one Come bet per player per roll, rules doc); bets that travelled to a number stay separate.
    const isCome = type === 'come' || type === 'dont-come'
    const isMergeable = type !== 'hop-hard' && type !== 'hop-easy'
    if (isMergeable) {
      const existing = bets.find(b => b.type === type && (isCome
        ? b.comePoint == null
        : number != null ? b.number === number : b.number == null))
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
    if (!bet) return
    if (!canRemoveBet(bet, phase)) {
      set({ notice: bet.type === 'pass' ? 'Pass is a contract bet once the point is set' : 'Come bets stay until they win or lose' })
      return
    }
    set({ bets: bets.filter(b => b.id !== id), notice: null })
  },

  clearTable() {
    const { bets, phase } = get()
    if (bets.length === 0) return 0
    let cleared = 0
    const kept: ActiveBet[] = []
    for (const bet of bets) {
      if (canRemoveBet(bet, phase)) { cleared++; continue }
      if ((bet.odds ?? 0) > 0) cleared++
      kept.push((bet.odds ?? 0) > 0 ? { ...bet, odds: 0 } : bet)
    }
    const notice = kept.length === 0 ? null
      : cleared > 0 ? 'Pass and Come bets on a point stay up; the rest came down'
      : 'Pass and Come bets on a point can’t come down'
    set({ bets: kept, notice })
    return cleared
  },

  canClear() {
    const { bets, phase } = get()
    return bets.some(b => canRemoveBet(b, phase) || (b.odds ?? 0) > 0)
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
    return amount <= shownBalance(profile.balance, get().bets)
  },

  addOdds(betId, amount) {
    if (amount > 0) {
      const { bets, point, tableRules } = get()
      const bet = bets.find(b => b.id === betId)
      if (!bet) return false
      // Each bet's odds are capped against its own point: the come point for Come / Don't Come.
      const max = oddsCap(bet, point, tableRules.oddsMultiple)
      if (max == null) {
        set({ notice: 'Odds go on a bet with a point' })
        return false
      }
      if ((bet.odds ?? 0) + amount > max) {
        set({ notice: `Max odds here is $${max}` })
        return false
      }
    }
    if (amount > 0 && !get().canAfford(amount)) {
      set({ notice: 'Not enough balance' })
      return false
    }
    set(s => ({ bets: s.bets.map(b => b.id === betId ? { ...b, odds: (b.odds ?? 0) + amount } : b), notice: null }))
    return true
  },

  toggleWorking(betId) {
    set(s => ({ bets: s.bets.map(b => b.id === betId ? { ...b, working: !b.working } : b), notice: null }))
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
