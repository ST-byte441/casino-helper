import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { TableRules, CrapsTableRules, BaccaratRevealMode, RouletteSettings } from '../../lib/types'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'

const DEFAULT_CRAPS_RULES: CrapsTableRules = {
  variant: 'craps',
  oddsMultiple: '3-4-5x',
  fieldPays3on12: false,
}

type PreferencesState = {
  blackjackRules: TableRules
  crapsRules: CrapsTableRules
  baccaratRevealMode: BaccaratRevealMode
  rouletteSettings: RouletteSettings
  saveRouletteSettings(s: RouletteSettings): void
  saveBlackjackRules(rules: TableRules): void
  saveCrapsRules(rules: CrapsTableRules): void
  setBaccaratRevealMode(mode: BaccaratRevealMode): void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      blackjackRules: DEFAULT_TABLE_RULES,
      crapsRules: DEFAULT_CRAPS_RULES,
      baccaratRevealMode: 'squeeze',
      rouletteSettings: { wheel: 'double', speed: 'slow' },
      saveRouletteSettings: (s) => set({ rouletteSettings: s }),
      saveBlackjackRules: (rules) => set({ blackjackRules: rules }),
      saveCrapsRules: (rules) => set({ crapsRules: rules }),
      setBaccaratRevealMode: (mode) => set({ baccaratRevealMode: mode }),
    }),
    {
      name: 'preferences-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
