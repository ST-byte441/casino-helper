jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return {
    ...actual,
    persist: (config: any) => config,
    createJSONStorage: () => undefined,
  }
})

import { usePreferencesStore } from '../../features/preferences/store'

test("defaults baccaratRevealMode to 'squeeze'", () => {
  expect(usePreferencesStore.getState().baccaratRevealMode).toBe('squeeze')
})

test("setBaccaratRevealMode('flip') updates it", () => {
  usePreferencesStore.getState().setBaccaratRevealMode('flip')
  expect(usePreferencesStore.getState().baccaratRevealMode).toBe('flip')
})

test("rouletteSettings default to double wheel, slow speed", () => {
  expect(usePreferencesStore.getState().rouletteSettings).toEqual({ wheel: 'double', speed: 'slow' })
})

test("saveRouletteSettings persists in state", () => {
  usePreferencesStore.getState().saveRouletteSettings({ wheel: 'triple', speed: 'fast' })
  expect(usePreferencesStore.getState().rouletteSettings).toEqual({ wheel: 'triple', speed: 'fast' })
})
