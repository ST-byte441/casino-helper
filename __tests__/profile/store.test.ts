jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

// Mock zustand's persist middleware to be a no-op so async storage hydration
// doesn't interfere with state resets between tests.
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return {
    ...actual,
    persist: (config: any) => config,
    createJSONStorage: () => undefined,
  }
})

import { act, renderHook } from '@testing-library/react-native'
import { useProfileStore } from '../../features/profile/store'
import { emptyStats, gamesNet, refillTotal } from '../../features/profile/stats'

beforeEach(() => {
  useProfileStore.setState({
    profiles: [],
    activeProfileId: null,
  })
})

test('addProfile creates a profile with the given name and balance', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Alice', 1000, 'finite'))
  expect(result.current.profiles).toHaveLength(1)
  expect(result.current.profiles[0].name).toBe('Alice')
  expect(result.current.profiles[0].balance).toBe(1000)
  expect(result.current.profiles[0].bankrollMode).toBe('finite')
})

test('setActiveProfile sets the activeProfileId', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Bob', 500, 'finite'))
  const id = result.current.profiles[0].id
  act(() => result.current.setActiveProfile(id))
  expect(result.current.activeProfileId).toBe(id)
})

test('deleteProfile removes the profile', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Eve', 200, 'finite'))
  const id = result.current.profiles[0].id
  act(() => result.current.deleteProfile(id))
  expect(result.current.profiles).toHaveLength(0)
})

test('deleteProfile clears activeProfileId when active profile is deleted', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Frank', 500, 'finite'))
  const id = result.current.profiles[0].id
  act(() => result.current.setActiveProfile(id))
  act(() => result.current.deleteProfile(id))
  expect(result.current.activeProfileId).toBeNull()
})

function setup(mode: 'finite' | 'infinite', chips: number) {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('P', chips, mode))
  return { result, id: result.current.profiles[0].id }
}

test('addProfile fills tracking fields', () => {
  const { result } = setup('finite', 1000)
  const p = result.current.profiles[0]
  expect(p.startingBalance).toBe(1000)
  expect(p.trackingSince).toBe(p.createdAt)
  expect(p.refills).toEqual([])
  expect(p.stats).toEqual(emptyStats())
  expect(p.picture).toBeUndefined()
})

test('recordHands on finite profile changes balance without a floor and updates stats', () => {
  const { result } = setup('finite', 100)
  act(() => result.current.recordHands('blackjack', [{ result: 'loss', delta: -150 }]))
  const p = result.current.profiles[0]
  expect(p.balance).toBe(-50)
  expect(p.stats.blackjack.losses).toBe(1)
  expect(p.stats.blackjack.net).toBe(-150)
})

test('recordHands on infinite profile keeps balance but records stats', () => {
  const { result } = setup('infinite', 0)
  act(() => result.current.recordHands('baccarat', [{ result: 'win', delta: 40 }]))
  const p = result.current.profiles[0]
  expect(p.balance).toBe(0)
  expect(p.stats.baccarat.wins).toBe(1)
})

test('recording with no active profile changes nothing', () => {
  const { result } = setup('finite', 300)
  act(() => result.current.setActiveProfile('__none__'))
  const before = JSON.stringify(result.current.profiles)
  act(() => result.current.recordCrapsRoll({ delta: 10, hadBets: true }))
  act(() => result.current.recordHands('blackjack', [{ result: 'win', delta: 10 }]))
  expect(JSON.stringify(result.current.profiles)).toBe(before)
})

test('invariant: startingBalance + refills + gamesNet === balance', () => {
  const { result, id } = setup('finite', 1000)
  act(() => { result.current.addMoney(id, 500) })
  act(() => result.current.recordHands('blackjack', [{ result: 'win', delta: 25 }, { result: 'loss', delta: -75 }]))
  act(() => result.current.recordCrapsRoll({ delta: -30, hadBets: true, phaseChange: 'seven-out' }))
  act(() => result.current.recordHands('baccarat', [{ result: 'push', delta: 0 }]))
  const p = result.current.profiles[0]
  expect(p.startingBalance + refillTotal(p.refills) + gamesNet(p.stats)).toBe(p.balance)
})

test('addMoney rejects invalid amounts and infinite profiles', () => {
  const { result, id } = setup('finite', 100)
  for (const bad of [0, -5, 12.5, NaN, Infinity]) {
    let ok = true
    act(() => { ok = result.current.addMoney(id, bad) })
    expect(ok).toBe(false)
  }
  expect(result.current.profiles[0].balance).toBe(100)
  expect(result.current.profiles[0].refills).toEqual([])
  let ok = false
  act(() => { ok = result.current.addMoney(id, 500) })
  expect(ok).toBe(true)
  expect(result.current.profiles[0].balance).toBe(600)
  expect(result.current.profiles[0].refills).toEqual([{ amount: 500, at: expect.any(Number) }])

  const inf = setup('infinite', 0)
  let ok2 = true
  act(() => { ok2 = inf.result.current.addMoney(inf.result.current.profiles[1].id, 50) })
  expect(ok2).toBe(false)
})

test('setPicture sets and clears', () => {
  const { result, id } = setup('finite', 100)
  act(() => result.current.setPicture(id, { kind: 'preset', id: 'x' }))
  expect(result.current.profiles[0].picture).toEqual({ kind: 'preset', id: 'x' })
  act(() => result.current.setPicture(id, undefined))
  expect(result.current.profiles[0].picture).toBeUndefined()
})

jest.mock('../../features/profile/pictures', () => ({
  deleteUploadedPicture: jest.fn(),
}))

test('deleteProfile removes an uploaded picture file', () => {
  const { deleteUploadedPicture } = require('../../features/profile/pictures')
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Pic', 100, 'finite'))
  const id = result.current.profiles[0].id
  act(() => result.current.setPicture(id, { kind: 'upload', uri: 'file:///u.jpg' }))
  act(() => result.current.deleteProfile(id))
  expect(deleteUploadedPicture).toHaveBeenCalledWith('file:///u.jpg')
})

test('deleteProfile does not touch files for preset pictures', () => {
  const { deleteUploadedPicture } = require('../../features/profile/pictures')
  deleteUploadedPicture.mockClear()
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Pre', 100, 'finite'))
  const id = result.current.profiles[0].id
  act(() => result.current.setPicture(id, { kind: 'preset', id: 'x' }))
  act(() => result.current.deleteProfile(id))
  expect(deleteUploadedPicture).not.toHaveBeenCalled()
})
