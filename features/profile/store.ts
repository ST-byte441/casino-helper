import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Profile, BankrollMode, ProfilePicture, SettledHand, SettledRoll, GameId } from './types'
import { emptyStats, applyHands, applyCrapsRoll } from './stats'
import { migrateProfileState } from './migrate'
import { deleteUploadedPicture } from './pictures'

type ProfileStore = {
  profiles: Profile[]
  activeProfileId: string | null
  addProfile: (name: string, startingChips: number, mode: BankrollMode) => void
  setActiveProfile: (id: string) => void
  recordHands: (game: Exclude<GameId, 'craps'>, hands: SettledHand[]) => void
  recordCrapsRoll: (roll: SettledRoll) => void
  addMoney: (id: string, amount: number) => boolean
  setPicture: (id: string, picture: ProfilePicture | undefined) => void
  deleteProfile: (id: string) => void
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      addProfile: (name, startingChips, mode) => {
        const createdAt = Date.now()
        const profile: Profile = {
          id: createdAt.toString(36) + Math.random().toString(36).slice(2),
          name,
          bankrollMode: mode,
          balance: startingChips,
          createdAt,
          startingBalance: startingChips,
          trackingSince: createdAt,
          refills: [],
          stats: emptyStats(),
        }
        set(state => ({ profiles: [...state.profiles, profile], activeProfileId: profile.id }))
      },

      setActiveProfile: (id) => set({ activeProfileId: id }),

      recordHands: (game, hands) => {
        const { profiles, activeProfileId } = get()
        if (!profiles.some(p => p.id === activeProfileId)) return
        const total = hands.reduce((sum, h) => sum + h.delta, 0)
        set({
          profiles: profiles.map(p =>
            p.id === activeProfileId
              ? {
                  ...p,
                  balance: p.bankrollMode === 'finite' ? p.balance + total : p.balance,
                  stats: { ...p.stats, [game]: applyHands(p.stats[game], hands) },
                }
              : p
          ),
        })
      },

      recordCrapsRoll: (roll) => {
        const { profiles, activeProfileId } = get()
        if (!profiles.some(p => p.id === activeProfileId)) return
        set({
          profiles: profiles.map(p =>
            p.id === activeProfileId
              ? {
                  ...p,
                  balance: p.bankrollMode === 'finite' ? p.balance + roll.delta : p.balance,
                  stats: { ...p.stats, craps: applyCrapsRoll(p.stats.craps, roll) },
                }
              : p
          ),
        })
      },

      addMoney: (id, amount) => {
        if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) return false
        const profile = get().profiles.find(p => p.id === id)
        if (!profile || profile.bankrollMode !== 'finite') return false
        set({
          profiles: get().profiles.map(p =>
            p.id === id
              ? { ...p, balance: p.balance + amount, refills: [...p.refills, { amount, at: Date.now() }] }
              : p
          ),
        })
        return true
      },

      setPicture: (id, picture) => {
        const old = get().profiles.find(p => p.id === id)?.picture
        // A replaced upload is no longer referenced anywhere, so remove its file
        if (old?.kind === 'upload' && !(picture?.kind === 'upload' && picture.uri === old.uri)) {
          deleteUploadedPicture(old.uri)
        }
        set(state => ({
          profiles: state.profiles.map(p => (p.id === id ? { ...p, picture } : p)),
        }))
      },

      deleteProfile: (id) => {
        const pic = get().profiles.find(p => p.id === id)?.picture
        if (pic?.kind === 'upload') deleteUploadedPicture(pic.uri)
        set(state => ({
          profiles: state.profiles.filter(p => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }))
      },
    }),
    {
      name: 'profile-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (s, v) => migrateProfileState(s, v, Date.now()) as any,
    }
  )
)
