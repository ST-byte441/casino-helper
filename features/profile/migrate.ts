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
  if (fromVersion >= 1) return { profiles: old as Profile[], activeProfileId }
  const profiles: Profile[] = old.map(p => ({
    ...p,
    startingBalance: p.balance,
    trackingSince: now,
    refills: [],
    stats: emptyStats(),
  }))
  return { profiles, activeProfileId }
}
