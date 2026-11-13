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
