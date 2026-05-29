import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { TableRules, CrapsTableRules } from '../../lib/types'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'

const DEFAULT_CRAPS_RULES: CrapsTableRules = {
  variant: 'craps',
  oddsMultiple: '3-4-5x',
  fieldPays3on12: false,
}

type PreferencesState = {
  blackjackRules: TableRules
  crapsRules: CrapsTableRules
  saveBlackjackRules(rules: TableRules): void
  saveCrapsRules(rules: CrapsTableRules): void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      blackjackRules: DEFAULT_TABLE_RULES,
      crapsRules: DEFAULT_CRAPS_RULES,
      saveBlackjackRules: (rules) => set({ blackjackRules: rules }),
      saveCrapsRules: (rules) => set({ crapsRules: rules }),
    }),
    {
      name: 'preferences-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
