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

test('updateBalance adds delta to active finite profile', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Carol', 1000, 'finite'))
  const id = result.current.profiles[0].id
  act(() => result.current.setActiveProfile(id))
  act(() => result.current.updateBalance(150))
  expect(result.current.profiles[0].balance).toBe(1150)
})

test('updateBalance is a no-op for infinite profiles', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Dave', 0, 'infinite'))
  const id = result.current.profiles[0].id
  act(() => result.current.setActiveProfile(id))
  act(() => result.current.updateBalance(-500))
  expect(result.current.profiles[0].balance).toBe(0)
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

test('updateBalance floors balance at zero, never goes negative', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Grace', 100, 'finite'))
  const id = result.current.profiles[0].id
  act(() => result.current.setActiveProfile(id))
  act(() => result.current.updateBalance(-500))
  expect(result.current.profiles[0].balance).toBe(0)
})

test('updateBalance is a no-op when no active profile is set', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Hal', 300, 'finite'))
  // No setActiveProfile called — activeProfileId remains null
  act(() => result.current.updateBalance(100))
  expect(result.current.profiles[0].balance).toBe(300)
})
