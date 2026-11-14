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

import React from 'react'
import { StyleSheet } from 'react-native'
import { render, fireEvent, act, within } from '@testing-library/react-native'
import { Card as CardView } from '../../features/blackjack/components/Card'
import BlackjackScreen from '../../app/blackjack'
import { useBlackjackStore } from '../../features/blackjack/store'
import { useProfileStore } from '../../features/profile/store'
import { emptyStats } from '../../features/profile/stats'
import { Card } from '../../lib/types'

const c = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })
const DOWN: Card = { value: 'K', suit: '♠', faceDown: true }

type Win = { width: number; height: number }
const PHONE: Win = { width: 384, height: 832 }
const COMPACT: Win = { width: 320, height: 700 }
const LARGE_PORTRAIT: Win = { width: 673, height: 884 }
const LARGE_LANDSCAPE: Win = { width: 884, height: 673 }

const flat = (style: unknown) => StyleSheet.flatten(style as any)

function setWindow(w: Win) {
  mockWindow = { ...w, scale: 3, fontScale: 1 }
}

function seedProfile(balance = 1000) {
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance, createdAt: 0,
      startingBalance: balance, trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
  })
}

/** Renders the blackjack screen at the given window size and presses Play. */
function renderTable(w: Win = PHONE) {
  setWindow(w)
  const screen = render(<BlackjackScreen />)
  fireEvent.press(screen.getByText('Play'))
  return screen
}

/** Puts the table directly into a phase with the given cards. */
function setPhase(state: Partial<ReturnType<typeof useBlackjackStore.getState>>) {
  act(() => useBlackjackStore.setState(state))
}

const PLAYING = {
  phase: 'playing' as const,
  bet: 25,
  handBets: [25],
  dealerHand: [c('K'), DOWN],
  playerHands: [[c('8', '♥'), c('3', '♣')]],
  activeHandIndex: 0,
}
const SPLIT4 = {
  ...PLAYING,
  handBets: [25, 25, 25, 25],
  playerHands: [[c('8', '♥'), c('3')], [c('8', '♦'), c('K')], [c('8', '♣'), c('2')], [c('8'), c('5')]],
  activeHandIndex: 2,
}
const SPLIT3 = {
  ...PLAYING,
  handBets: [25, 25, 25],
  playerHands: [[c('8', '♥'), c('3')], [c('8', '♦'), c('K')], [c('8', '♣')]],
  activeHandIndex: 1,
}

beforeEach(() => {
  jest.useFakeTimers()
  seedProfile()
  useBlackjackStore.setState(useBlackjackStore.getState().getInitialState())
})

afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

describe('phone layout is pinned', () => {
  test('phone setup', () => {
    setWindow(PHONE)
    const screen = render(<BlackjackScreen />)
    expect(screen.toJSON()).toMatchSnapshot()
  })

  test('phone betting', () => {
    const screen = renderTable()
    setPhase({ bet: 25 })
    expect(screen.toJSON()).toMatchSnapshot()
  })

  test('phone playing', () => {
    const screen = renderTable()
    setPhase(PLAYING)
    expect(screen.toJSON()).toMatchSnapshot()
  })

  test('phone playing split', () => {
    const screen = renderTable()
    setPhase(SPLIT3)
    expect(screen.toJSON()).toMatchSnapshot()
  })

  test('phone dealer phase', () => {
    const screen = renderTable()
    setPhase({ ...PLAYING, phase: 'dealer', dealerHand: [c('K'), c('7')] })
    expect(screen.toJSON()).toMatchSnapshot()
  })

  test('phone result', () => {
    const screen = renderTable()
    setPhase({ ...PLAYING, phase: 'result', dealerHand: [c('K'), c('7')], lastOutcome: 'win', lastDelta: 25 })
    expect(screen.toJSON()).toMatchSnapshot()
  })

  test('compact 320x700 playing', () => {
    const screen = renderTable(COMPACT)
    setPhase(PLAYING)
    expect(screen.toJSON()).toMatchSnapshot()
  })
})

describe('large portrait', () => {
  test('cards are large, split hands wrap side by side, controls sit in a centred column', () => {
    const screen = renderTable(LARGE_PORTRAIT)
    setPhase(SPLIT4)
    const cards = screen.UNSAFE_getAllByType(CardView)
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach(card => expect(card.props.size).toBe('large'))
    expect(flat(screen.getByTestId('bj-hands').props.style)).toMatchObject({
      flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    })
    const column = screen.getByTestId('bj-controls-column')
    expect(flat(column.props.style)).toMatchObject({ maxWidth: 520, alignSelf: 'center', width: '100%' })
    expect(flat(within(column).getByText('Hit').props.style).fontSize).toBe(22)
  })

  test('header and footer text grow 1.3x', () => {
    const screen = renderTable(LARGE_PORTRAIT)
    setPhase(PLAYING)
    expect(flat(screen.getByText('Back').props.style).fontSize).toBe(20)
    expect(flat(screen.getByText('Balance: $1,000').props.style).fontSize).toBe(18)
  })

  test('the result banner is large', () => {
    const screen = renderTable(LARGE_PORTRAIT)
    setPhase({ ...PLAYING, phase: 'result', dealerHand: [c('K'), c('7')], lastOutcome: 'win', lastDelta: 25 })
    expect(flat(screen.getByText('Next Hand').props.style).fontSize).toBe(22)
    expect(flat(screen.getByText(/You Win!/).props.style).fontSize).toBe(32)
  })
})
