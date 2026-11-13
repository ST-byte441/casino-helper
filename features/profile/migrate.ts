import type { Profile } from './types'
import { emptyStats } from './stats'

export function migrateProfileState(
  persisted: unknown,
  fromVersion: number,
  now: number,
): { profiles: Profile[]; activeProfileId: string | null } {
  const state = (persisted ?? {}) as { profiles?: any[]; activeProfileId?: string | null }
  const old = Array.isArray(state.profiles) ? state.profiles : []
  const activeProfileId = state.activeProfileId ?? null
  let profiles = old
  if (fromVersion < 1) {
    // v0 -> v1: add bankroll tracking and empty stats
    profiles = profiles.map(p => ({
      ...p,
      startingBalance: p.balance,
      trackingSince: now,
      refills: [],
      stats: emptyStats(),
    }))
  }
  if (fromVersion < 2) {
    // v1 -> v2: craps gained longestRoll
    profiles = profiles.map(p => ({
      ...p,
      stats: { ...p.stats, craps: { longestRoll: 0, ...p.stats.craps } },
    }))
  }
  return { profiles: profiles as Profile[], activeProfileId }
}
