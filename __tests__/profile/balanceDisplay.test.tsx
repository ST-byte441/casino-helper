jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }))
// null: the default jest window (750x1334, a large screen). The craps list test pins a phone window.
let mockWindow: { width: number; height: number; scale: number; fontScale: number } | null = null
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => {
  const actual = jest.requireActual('react-native/Libraries/Utilities/useWindowDimensions').default
  return { __esModule: true, default: () => mockWindow ?? actual() }
})
import 'react-native-gesture-handler/jestSetup'

import React from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { render as rtlRender, fireEvent } from '@testing-library/react-native'
import LobbyScreen from '../../app/(tabs)/index'
import BlackjackScreen from '../../app/blackjack'
import BaccaratScreen from '../../app/baccarat'
import CrapsScreen from '../../app/craps'
import { useProfileStore } from '../../features/profile/store'
import { useCrapsStore } from '../../features/craps/store'
import { useBaccaratStore } from '../../features/baccarat/store'
import { emptyStats } from '../../features/profile/stats'


const render: typeof rtlRender = (ui, options) => rtlRender(ui, { wrapper: GestureHandlerRootView, ...options })

function setProfile(mode: 'finite' | 'infinite', balance: number) {
  useProfileStore.setState({
    profiles: [{
      id: 'p1', name: 'T', bankrollMode: mode, balance, createdAt: 0,
      startingBalance: 100, trackingSince: 0, refills: [], stats: emptyStats(),
    }],
    activeProfileId: 'p1',
  })
}
const colorOf = (el: any) => StyleSheet.flatten(el.props.style)?.color

beforeEach(() => jest.useFakeTimers())
afterEach(() => { jest.useRealTimers(); mockWindow = null })

describe('negative balances on game screens', () => {
  test('lobby shows −$X in red', () => {
    setProfile('finite', -1250)
    const { getByText } = render(<LobbyScreen />)
    expect(colorOf(getByText('−$1,250'))).toBe('#ff5555')
  })

  test('lobby keeps ∞ for infinite profiles', () => {
    setProfile('infinite', -50)
    const { getByText } = render(<LobbyScreen />)
    expect(colorOf(getByText('∞'))).not.toBe('#ff5555')
  })

  test('blackjack footer shows −$X in red', () => {
    setProfile('finite', -50)
    const { getByText } = render(<BlackjackScreen />)
    fireEvent.press(getByText('Play'))
    expect(colorOf(getByText('Balance: −$50'))).toBe('#ff5555')
  })

  test('baccarat footer shows −$X in red', () => {
    setProfile('finite', -50)
    useBaccaratStore.getState().newHand()
    const { getByText } = render(<BaccaratScreen />)
    expect(colorOf(getByText('Balance: −$50'))).toBe('#ff5555')
  })

  test('craps footer shows −$X in red', () => {
    mockWindow = { width: 384, height: 832, scale: 3, fontScale: 1 }
    setProfile('finite', -50)
    useCrapsStore.getState().setTableRules({ variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false })
    const { getByText } = render(<CrapsScreen />)
    // Animated color (it flashes green on a win) resolves to rgba at rest
    expect(colorOf(getByText('Balance: −$50'))).toBe('rgba(255, 85, 85, 1)')
  })

  test('craps table header shows −$X in red', () => {
    setProfile('finite', -50)
    useCrapsStore.getState().setTableRules({ variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false })
    const { getByText, getByTestId } = render(<CrapsScreen />)
    expect(getByTestId('craps-board')).toBeTruthy()
    expect(colorOf(getByText('−$50'))).toBe('#ff5555')
  })

  test('positive balances use the same $X format and are not red', () => {
    setProfile('finite', 1500)
    useBaccaratStore.getState().newHand()
    const { getByText } = render(<BaccaratScreen />)
    expect(colorOf(getByText('Balance: $1,500'))).not.toBe('#ff5555')
  })
})
