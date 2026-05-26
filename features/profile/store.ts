import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Profile, BankrollMode } from './types'

type ProfileStore = {
  profiles: Profile[]
  activeProfileId: string | null
  addProfile: (name: string, startingChips: number, mode: BankrollMode) => void
  setActiveProfile: (id: string) => void
  updateBalance: (delta: number) => void
  deleteProfile: (id: string) => void
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      addProfile: (name, startingChips, mode) => {
        const profile: Profile = {
          id: Math.random().toString(36).slice(2),
          name,
          bankrollMode: mode,
          balance: startingChips,
          createdAt: Date.now(),
        }
        set(state => ({ profiles: [...state.profiles, profile] }))
      },

      setActiveProfile: (id) => set({ activeProfileId: id }),

      updateBalance: (delta) => {
        const { profiles, activeProfileId } = get()
        const profile = profiles.find(p => p.id === activeProfileId)
        if (!profile || profile.bankrollMode === 'infinite') return
        set({
          profiles: profiles.map(p =>
            p.id === activeProfileId ? { ...p, balance: p.balance + delta } : p
          ),
        })
      },

      deleteProfile: (id) =>
        set(state => ({ profiles: state.profiles.filter(p => p.id !== id) })),
    }),
    {
      name: 'profile-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
