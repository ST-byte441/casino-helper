import { migrateProfileState } from '../../features/profile/migrate'
import { emptyStats } from '../../features/profile/stats'

test('v0 profiles gain tracking fields', () => {
  const out = migrateProfileState(
    { profiles: [{ id: 'a', name: 'A', bankrollMode: 'finite', balance: 730, createdAt: 1 }], activeProfileId: 'a' },
    0,
    999,
  )
  expect(out.activeProfileId).toBe('a')
  expect(out.profiles).toHaveLength(1)
  const p = out.profiles[0]
  expect(p.id).toBe('a')
  expect(p.name).toBe('A')
  expect(p.balance).toBe(730)
  expect(p.startingBalance).toBe(730)
  expect(p.trackingSince).toBe(999)
  expect(p.refills).toEqual([])
  expect(p.stats).toEqual(emptyStats())
  expect(p.picture).toBeUndefined()
})

test('empty or undefined state yields empty result', () => {
  expect(migrateProfileState(undefined, 0, 1)).toEqual({ profiles: [], activeProfileId: null })
  expect(migrateProfileState({}, 0, 1)).toEqual({ profiles: [], activeProfileId: null })
})

test('v1 profiles gain craps longestRoll', () => {
  const v1craps = { rolls: 4, pointsMade: 1, sevenOuts: 1, biggestWin: 10, net: -5 }
  const out = migrateProfileState({
    profiles: [{
      id: 'a', name: 'A', bankrollMode: 'finite', balance: 50, createdAt: 1,
      startingBalance: 100, trackingSince: 1, refills: [],
      stats: { ...emptyStats(), craps: v1craps },
    }],
    activeProfileId: 'a',
  }, 1, 999)
  expect(out.profiles[0].stats.craps).toEqual({ ...v1craps, longestRoll: 0 })
  expect(out.profiles[0].startingBalance).toBe(100)
  expect(out.activeProfileId).toBe('a')
})

test('v0 profiles also get longestRoll', () => {
  const out = migrateProfileState(
    { profiles: [{ id: 'a', name: 'A', bankrollMode: 'finite', balance: 5, createdAt: 1 }], activeProfileId: null }, 0, 9)
  expect(out.profiles[0].stats.craps.longestRoll).toBe(0)
})
