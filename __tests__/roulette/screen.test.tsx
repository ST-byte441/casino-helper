jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
const mockBack = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }))
let mockWindow = { width: 360, height: 640, scale: 2, fontScale: 1 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}))
import 'react-native-gesture-handler/jestSetup'

import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { render as rtlRender, fireEvent, act } from '@testing-library/react-native'
import * as ScreenOrientation from 'expo-screen-orientation'
import RouletteScreen from '../../app/roulette'
import { useRouletteStore } from '../../features/roulette/store'
import { useProfileStore } from '../../features/profile/store'
import { usePreferencesStore } from '../../features/preferences/store'
import { emptyStats } from '../../features/profile/stats'
import { BettingTable } from '../../features/roulette/components/BettingTable'

// gesture-handler 3 requires every GestureDetector to sit inside a GestureHandlerRootView.
const render: typeof rtlRender = (ui, options) => rtlRender(ui, { wrapper: GestureHandlerRootView, ...options })

type Screen = ReturnType<typeof render>

// The board is only drawn once its area has been measured: fire a layout on every view that listens for one.
function layoutAll(screen: Screen, width: number, height: number) {
  const nodes = screen.UNSAFE_root.findAll(n => typeof n.type === 'string' && typeof n.props.onLayout === 'function')
  act(() => {
    for (const n of nodes) n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height } } })
  })
}

function stackTotals(screen: Screen): Record<string, string> {
  const out: Record<string, string> = {}
  for (const n of screen.UNSAFE_root.findAll(
    n => typeof n.type === 'string' && typeof n.props.testID === 'string' && n.props.testID.startsWith('stack-'),
  )) {
    const text = n.findAll(c => typeof c.type === 'string' && c.type === 'Text')[0]
    out[n.props.testID] = [text.props.children].flat().join('')
  }
  return out
}

function startTable(): Screen {
  const screen = render(<RouletteScreen />)
  fireEvent.press(screen.getByText('Play'))
  layoutAll(screen, 340, 560)
  return screen
}

beforeEach(() => {
  mockWindow = { width: 360, height: 640, scale: 2, fontScale: 1 }
  jest.clearAllMocks()
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance: 1000, createdAt: 0,
      startingBalance: 1000, trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
  })
  usePreferencesStore.getState().saveRouletteSettings({ wheel: 'double', speed: 'slow' })
  useRouletteStore.getState().setSettings({ wheel: 'double', speed: 'slow' })
})

afterEach(() => jest.useRealTimers())

test('shows the setup first; Play opens the board, saves settings and unlocks rotation', () => {
  const screen = render(<RouletteScreen />)
  screen.getByText('Roulette Table')
  expect(ScreenOrientation.unlockAsync).not.toHaveBeenCalled()
  fireEvent.press(screen.getByText('Triple zero'))
  fireEvent.press(screen.getByText('Play'))
  expect(screen.queryByText('Roulette Table')).toBeNull()
  screen.getByTestId('roulette-spin')
  expect(ScreenOrientation.unlockAsync).toHaveBeenCalledTimes(1)
  expect(usePreferencesStore.getState().rouletteSettings).toEqual({ wheel: 'triple', speed: 'slow' })
  expect(useRouletteStore.getState().settings).toEqual({ wheel: 'triple', speed: 'slow' })
  screen.getByText('Triple zero · Slow')
  screen.getByText('$1,000')
})

test('unmounting locks portrait again and abandons the session (settling a spin in flight)', () => {
  const screen = startTable()
  act(() => useRouletteStore.setState({ bets: { red: 10 }, phase: 'spinning', result: 17 }))
  screen.unmount()
  expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.PORTRAIT_UP)
  // abandon() settled the spin (17 is black, so red loses) and reset the session.
  expect(useProfileStore.getState().profiles[0].balance).toBe(990)
  expect(useRouletteStore.getState().phase).toBe('betting')
  expect(useRouletteStore.getState().bets).toEqual({})
})

test('rotating keeps exactly the same stacks with the same totals', () => {
  const screen = startTable()
  act(() => useRouletteStore.setState({ bets: { 'straight:17': 5, red: 10 } }))
  layoutAll(screen, 340, 560)
  expect(screen.UNSAFE_getByType(BettingTable).props.orientation).toBe('portrait')
  const portrait = stackTotals(screen)
  expect(portrait).toEqual({ 'stack-straight:17': '$5', 'stack-red': '$10' })

  mockWindow = { width: 640, height: 360, scale: 2, fontScale: 1 }
  screen.rerender(<RouletteScreen />)
  layoutAll(screen, 560, 300)
  expect(screen.UNSAFE_getByType(BettingTable).props.orientation).toBe('landscape')
  expect(stackTotals(screen)).toEqual(portrait)
})

test('a full spin: wheel, result after 7000 ms, back to the board with the marker', () => {
  jest.useFakeTimers()
  const screen = startTable()
  act(() => useRouletteStore.setState({ bets: { red: 10 } }))
  act(() => { useRouletteStore.getState().spin(() => 0) })
  screen.getByTestId('wheel')
  expect(screen.queryByText('Back to table')).toBeNull()

  act(() => { jest.advanceTimersByTime(7000) })
  expect(useRouletteStore.getState().phase).toBe('result')
  screen.getByTestId('wheel')
  fireEvent.press(screen.getByText('Back to table'))
  layoutAll(screen, 340, 560)
  screen.getByTestId('roulette-spin')
  screen.getByTestId('roulette-marker')
})

test('the Back button leaves the screen', () => {
  const screen = startTable()
  fireEvent.press(screen.getByText('← Back'))
  expect(mockBack).toHaveBeenCalled()
})
