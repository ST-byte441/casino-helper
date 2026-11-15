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
import BaccaratScreen from '../../app/baccarat'
import { useBaccaratStore } from '../../features/baccarat/store'
import { Card } from '../../lib/types'

// gesture-handler 3 requires every GestureDetector to sit inside a GestureHandlerRootView.
const render: typeof rtlRender = (ui, options) => rtlRender(ui, { wrapper: GestureHandlerRootView, ...options })

const c = (value: Card['value']): Card => ({ value, suit: '♠' })
const STACKED: Card[] = [c('9'), c('3'), c('K'), c('K'), ...Array.from({ length: 10 }, () => c('K'))]

function dealWith(mode: 'squeeze' | 'flip') {
  useBaccaratStore.getState().newHand()
  useBaccaratStore.setState({ deck: [...STACKED] })
  useBaccaratStore.getState().placeBet('player', 15)
  useBaccaratStore.getState().deal(mode)
}

type Win = { width: number; height: number }
export const PHONE: Win = { width: 384, height: 832 }
const COMPACT: Win = { width: 320, height: 700 }
const LARGE_PORTRAIT: Win = { width: 673, height: 884 }
const LARGE_LANDSCAPE: Win = { width: 884, height: 673 }
function setWindow(w: Win) {
  mockWindow = { ...w, scale: 3, fontScale: 1 }
}
// Player K,K (0) and Banker K,K (0) both draw: a 5 each, so both hands end with 3 cards.
const THIRD_CARDS: Card[] = [c('K'), c('K'), c('K'), c('K'), c('5'), c('5'), ...Array.from({ length: 10 }, () => c('K'))]

function seedProfile(balance = 1000) {
  const { useProfileStore } = require('../../features/profile/store')
  const { emptyStats } = require('../../features/profile/stats')
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance, createdAt: 0,
      startingBalance: balance, trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
  })
}

function dealDeck(cards: Card[], mode: 'squeeze' | 'flip') {
  useBaccaratStore.getState().newHand()
  useBaccaratStore.setState({ deck: [...cards] })
  useBaccaratStore.getState().placeBet('player', 15)
  useBaccaratStore.getState().deal(mode)
}

function revealAll() {
  while (useBaccaratStore.getState().phase === 'revealing') useBaccaratStore.getState().revealNext()
}

beforeEach(() => {
  jest.useFakeTimers()
  setWindow(PHONE)
})
afterEach(() => jest.useRealTimers())

describe('phone layout (must not change)', () => {
  beforeEach(() => seedProfile())

  test('betting, empty', () => {
    useBaccaratStore.getState().newHand()
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })

  test('betting, $15 on Player', () => {
    useBaccaratStore.getState().newHand()
    useBaccaratStore.getState().placeBet('player', 15)
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })

  test('squeeze, first card', () => {
    dealDeck(THIRD_CARDS, 'squeeze')
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })

  test('flip, first card', () => {
    dealDeck(THIRD_CARDS, 'flip')
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })

  test('result, three cards each', () => {
    dealDeck(THIRD_CARDS, 'flip')
    revealAll()
    expect(useBaccaratStore.getState().phase).toBe('result')
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })

  test('compact 320×700, betting', () => {
    setWindow(COMPACT)
    useBaccaratStore.getState().newHand()
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })
})

test('table does not bounce while squeezing', () => {
  dealWith('squeeze')
  const { getByTestId } = render(<BaccaratScreen />)
  expect(getByTestId('baccarat-table').props.bounces).toBe(false)
})

test('table still bounces in flip mode', () => {
  dealWith('flip')
  const { getByTestId } = render(<BaccaratScreen />)
  expect(getByTestId('baccarat-table').props.bounces).toBe(true)
})

describe('header squeeze toggle', () => {
  const { usePreferencesStore } = require('../../features/preferences/store')
  const { fireEvent } = require('@testing-library/react-native')

  beforeEach(() => useBaccaratStore.getState().newHand())

  test('reads "Squeeze ●" when on and "Squeeze ○" when off', () => {
    usePreferencesStore.getState().setBaccaratRevealMode('squeeze')
    const { getByText, rerender } = render(<BaccaratScreen />)
    expect(getByText('Squeeze ●')).toBeTruthy()
    usePreferencesStore.getState().setBaccaratRevealMode('flip')
    rerender(<BaccaratScreen />)
    expect(getByText('Squeeze ○')).toBeTruthy()
  })

  test('tapping it switches between squeeze and flip', () => {
    usePreferencesStore.getState().setBaccaratRevealMode('squeeze')
    const { getByText } = render(<BaccaratScreen />)
    fireEvent.press(getByText('Squeeze ●'))
    expect(usePreferencesStore.getState().baccaratRevealMode).toBe('flip')
  })

  test('no Assist button in baccarat', () => {
    const { queryByText } = render(<BaccaratScreen />)
    expect(queryByText(/Assist/)).toBeNull()
  })
})

test('DEAL stays disabled with a hint until Player or Banker has the $15 minimum', () => {
  const { fireEvent } = require('@testing-library/react-native')
  const { useProfileStore } = require('../../features/profile/store')
  const { emptyStats } = require('../../features/profile/stats')
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance: 500, createdAt: 0,
      startingBalance: 500, trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
  })
  useBaccaratStore.getState().newHand()
  const { getByText, getByTestId, queryByText } = render(<BaccaratScreen />)
  getByText('Min $15 on Player or Banker')
  fireEvent.press(getByTestId('main-chip-25'))
  fireEvent.press(getByText('Banker'))
  expect(useBaccaratStore.getState().bets.banker).toBe(25)
  expect(queryByText('Min $15 on Player or Banker')).toBeNull()
})

test('the header title stays on one line so narrow screens shrink it instead of crowding', () => {
  useBaccaratStore.getState().newHand()
  const screen = render(<BaccaratScreen />)
  expect(screen.getByText('BACCARAT').props.numberOfLines).toBe(1)
})
