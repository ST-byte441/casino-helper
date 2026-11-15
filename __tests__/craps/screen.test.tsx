jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }))
let mockWindow = { width: 384, height: 832, scale: 3, fontScale: 1 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}))
import 'react-native-gesture-handler/jestSetup'

import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { render as rtlRender } from '@testing-library/react-native'
import CrapsScreen from '../../app/craps'
import { useCrapsStore } from '../../features/craps/store'
import { ActiveBet, BetType, CrapsTableRules } from '../../lib/types'

const render: typeof rtlRender = (ui, options) => rtlRender(ui, { wrapper: GestureHandlerRootView, ...options })

type Win = { width: number; height: number }
export const PHONE: Win = { width: 384, height: 832 }
export const PHONE_LANDSCAPE: Win = { width: 832, height: 384 }
export const FOLD_COVER_LANDSCAPE: Win = { width: 880, height: 340 }
export const LARGE_PORTRAIT: Win = { width: 673, height: 884 }
export const LARGE_LANDSCAPE: Win = { width: 884, height: 673 }
export function setWindow(w: Win) {
  mockWindow = { ...w, scale: 3, fontScale: 1 }
}

export function seedProfile(balance = 1000) {
  const { useProfileStore } = require('../../features/profile/store')
  const { emptyStats } = require('../../features/profile/stats')
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance, createdAt: 0,
      startingBalance: balance, trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
  })
}

const STANDARD: CrapsTableRules = { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: true }

let nextId = 0
export function bet(type: BetType, amount: number, extra: Partial<ActiveBet> = {}): ActiveBet {
  return { id: `b${nextId++}`, type, amount, working: true, ...extra }
}

export function seedTable(state: {
  phase?: 'come-out' | 'point'
  point?: number | null
  bets?: ActiveBet[]
  rules?: CrapsTableRules
}) {
  useCrapsStore.setState({
    phase: state.phase ?? 'come-out',
    point: state.point ?? null,
    bets: state.bets ?? [],
    tableRules: state.rules ?? STANDARD,
    dice: null,
    lastRoll: null,
    lastDelta: 0,
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  nextId = 0
  setWindow(PHONE)
  seedProfile()
})
afterEach(() => jest.useRealTimers())

describe('phone portrait list (must not change)', () => {
  test('come-out, no bets', () => {
    seedTable({})
    const { toJSON, getByTestId } = render(<CrapsScreen />)
    expect(getByTestId('craps-rotate-hint')).toBeTruthy()
    expect(toJSON()).toMatchSnapshot()
  })

  test('point 6 with pass + odds, place 8 and field', () => {
    seedTable({
      phase: 'point', point: 6,
      bets: [bet('pass', 10, { odds: 20 }), bet('place', 12, { number: 8 }), bet('field', 5)],
    })
    expect(render(<CrapsScreen />).toJSON()).toMatchSnapshot()
  })

  test('crapless table', () => {
    seedTable({ rules: { variant: 'crapless', oddsMultiple: '3-4-5x', fieldPays3on12: true } })
    expect(render(<CrapsScreen />).toJSON()).toMatchSnapshot()
  })

  test('easy table', () => {
    seedTable({ rules: { variant: 'easy', oddsMultiple: '3-4-5x', fieldPays3on12: false } })
    expect(render(<CrapsScreen />).toJSON()).toMatchSnapshot()
  })
})
