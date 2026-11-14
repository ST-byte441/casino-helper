import { create } from 'zustand'
import { Pocket, PlacedBets, RoulettePhase, RouletteSettings } from '../../lib/types'
import { allBets, betById, validateBets, settleSpin, pickPocket, totalStake } from './engine'
import { useProfileStore } from '../profile/store'
import { classifyNet } from '../profile/stats'

type RouletteState = {
  settings: RouletteSettings
  phase: RoulettePhase
  bets: PlacedBets
  history: { betId: string; amount: number }[]
  result: Pocket | null
  lastNet: number
  lastWinners: string[]
  marker: Pocket | null
}

type RouletteActions = {
  setSettings(s: RouletteSettings): void
  placeChip(betId: string, amount: number): boolean
  moveStack(from: string, to: string): void
  removeStack(betId: string): void
  undo(): void
  clearBets(): void
  spinError(): string | null
  spin(rng?: () => number): boolean
  finishSpin(): void
  backToTable(): void
  abandon(): void
}

const DEFAULT_SETTINGS: RouletteSettings = { wheel: 'double', speed: 'slow' }

const emptySession = {
  phase: 'betting' as RoulettePhase,
  bets: {} as PlacedBets,
  history: [] as { betId: string; amount: number }[],
  result: null as Pocket | null,
  lastNet: 0,
  lastWinners: [] as string[],
  marker: null as Pocket | null,
}

export const useRouletteStore = create<RouletteState & RouletteActions>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  ...emptySession,

  setSettings(s) {
    set({ ...emptySession, settings: s })
  },

  placeChip(betId, amount) {
    const { phase, settings, bets } = get()
    if (phase !== 'betting' || !betById(settings.wheel, betId)) return false
    const ps = useProfileStore.getState()
    const profile = ps.profiles.find(p => p.id === ps.activeProfileId)
    if (profile && profile.bankrollMode !== 'infinite' && totalStake(bets) + amount > profile.balance) {
      return false
    }
    set(s => ({
      bets: { ...s.bets, [betId]: (s.bets[betId] ?? 0) + amount },
      history: [...s.history, { betId, amount }],
      marker: null,
    }))
    return true
  },

  moveStack(from, to) {
    const { phase, settings, bets } = get()
    if (phase !== 'betting' || from === to || !bets[from] || !betById(settings.wheel, to)) return
    const { [from]: moved, ...rest } = bets
    set(s => ({
      bets: { ...rest, [to]: (rest[to] ?? 0) + moved },
      history: s.history.filter(h => h.betId !== from),
    }))
  },

  removeStack(betId) {
    if (get().phase !== 'betting') return
    set(s => {
      const { [betId]: _removed, ...rest } = s.bets
      return { bets: rest, history: s.history.filter(h => h.betId !== betId) }
    })
  },

  undo() {
    const { phase, history, bets } = get()
    if (phase !== 'betting' || history.length === 0) return
    const last = history[history.length - 1]
    const { [last.betId]: current, ...rest } = bets
    const remaining = (current ?? 0) - last.amount
    set({
      bets: remaining > 0 ? { ...rest, [last.betId]: remaining } : rest,
      history: history.slice(0, -1),
    })
  },

  clearBets() {
    if (get().phase !== 'betting') return
    set({ bets: {}, history: [] })
  },

  spinError() {
    const { bets, settings } = get()
    return validateBets(bets, settings.wheel)
  },

  spin(rng) {
    if (get().phase !== 'betting' || get().spinError() !== null) return false
    set({ result: pickPocket(get().settings.wheel, rng), phase: 'spinning', marker: null })
    return true
  },

  finishSpin() {
    const { phase, result, bets, settings } = get()
    if (phase !== 'spinning' || result === null) return
    const { net, winners } = settleSpin(bets, settings.wheel, result)
    useProfileStore.getState().recordHands('roulette', [{ result: classifyNet(net), delta: net }])
    const kept: PlacedBets = {}
    for (const id of winners) kept[id] = bets[id]
    set({ bets: kept, history: [], lastNet: net, lastWinners: winners, marker: result, phase: 'result' })
  },

  backToTable() {
    if (get().phase !== 'result') return
    set({ phase: 'betting' })
  },

  abandon() {
    if (get().phase === 'spinning') get().finishSpin()
    set({ ...emptySession, settings: get().settings })
  },
}))
