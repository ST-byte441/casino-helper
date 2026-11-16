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
import { StyleSheet, ScrollView } from 'react-native'
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
    expect(flat(screen.getByText('Balance: $975').props.style).fontSize).toBe(18)
  })

  test('the result banner is large', () => {
    const screen = renderTable(LARGE_PORTRAIT)
    setPhase({ ...PLAYING, phase: 'result', dealerHand: [c('K'), c('7')], lastOutcome: 'win', lastDelta: 25 })
    expect(flat(screen.getByText('Next Hand').props.style).fontSize).toBe(22)
    expect(flat(screen.getByText(/You Win!/).props.style).fontSize).toBe(32)
  })
})

describe('large landscape', () => {
  const panel = (screen: ReturnType<typeof render>) => screen.getByTestId('bj-panel')

  test('felt on the left, a 300dp control panel on the right with actions in a column and the balance', () => {
    const screen = renderTable(LARGE_LANDSCAPE)
    setPhase(PLAYING)
    expect(flat(panel(screen).props.style)).toMatchObject({
      width: 300, backgroundColor: '#0a4a24', borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    })
    const hit = within(panel(screen)).getByText('Hit')
    let row = hit.parent
    while (row && !(row.type === 'View' && flat(row.props.style)?.flexDirection)) row = row.parent
    expect(flat(row!.props.style).flexDirection).toBe('column')
    within(screen.getByTestId('bj-felt')).getByText('Dealer')
    within(panel(screen)).getByText('Balance: $975')
  })

  test('betting puts the chips and Deal in the panel', () => {
    const screen = renderTable(LARGE_LANDSCAPE)
    setPhase({ bet: 25 })
    within(panel(screen)).getByText('$15')
    within(panel(screen)).getByText('Deal')
  })

  test('the result and Next Hand show in the panel', () => {
    const screen = renderTable(LARGE_LANDSCAPE)
    setPhase({ ...PLAYING, phase: 'result', dealerHand: [c('K'), c('7')], lastOutcome: 'win', lastDelta: 25 })
    within(panel(screen)).getByText('Next Hand')
  })

  test.each(['dealing', 'dealer'] as const)('the %s phase shows only the balance in the panel', phase => {
    const screen = renderTable(LARGE_LANDSCAPE)
    setPhase({ ...PLAYING, phase })
    const p = within(panel(screen))
    p.getByText('Balance: $975')
    expect(p.queryByText('Hit')).toBeNull()
    expect(p.queryByText('Deal')).toBeNull()
    expect(p.queryByText('Next Hand')).toBeNull()
  })

  test('the funds warning appears in the panel', () => {
    seedProfile(10)
    const screen = renderTable(LARGE_LANDSCAPE)
    fireEvent.press(screen.getByText('$15'))
    within(panel(screen)).getByText('Insufficient funds')
  })

  test('rotating mid-hand keeps the hand and moves the controls', () => {
    const screen = renderTable(LARGE_PORTRAIT)
    setPhase({ ...SPLIT3, playerHands: SPLIT3.playerHands.slice(0, 2), handBets: [25, 25] })
    const before = useBlackjackStore.getState()
    setWindow(LARGE_LANDSCAPE)
    screen.rerender(<BlackjackScreen />)
    expect(useBlackjackStore.getState().playerHands).toBe(before.playerHands)
    expect(useBlackjackStore.getState().activeHandIndex).toBe(1)
    within(panel(screen)).getByText('Hit')
    within(screen.getByTestId('bj-felt')).getByText('Hand 2')
    setWindow(LARGE_PORTRAIT)
    screen.rerender(<BlackjackScreen />)
    expect(screen.queryByTestId('bj-panel')).toBeNull()
    within(screen.getByTestId('bj-controls-column')).getByText('Hit')
  })
})

test('on large screens the rules setup sits in a centred 520dp column', () => {
  setWindow(LARGE_PORTRAIT)
  const screen = render(<BlackjackScreen />)
  const column = screen.getByTestId('bj-setup-column')
  expect(flat(column.props.style)).toMatchObject({ maxWidth: 520, width: '100%', alignSelf: 'center' })
  within(column).getByText('Play')
})

describe('final review fixes', () => {
  test('after a rotation remounts the hands, the view scrolls to the active hand once it is laid out', () => {
    const screen = renderTable(LARGE_PORTRAIT)
    setPhase(SPLIT4)
    setWindow(LARGE_LANDSCAPE)
    screen.rerender(<BlackjackScreen />)
    const felt = screen.getByTestId('bj-felt')
    const scroll = within(felt).UNSAFE_getAllByType(ScrollView).find(s => s.props.style && flat(s.props.style).flex === 1)!
    const scrollTo = jest.fn()
    scroll.instance.scrollTo = scrollTo
    // Hand 3 (active) sits on the second row of the wrap.
    const items = (screen.getByTestId('bj-hands').children as any[]).filter(n => typeof n.props?.onLayout === 'function')
    expect(items).toHaveLength(4)
    act(() => {
      items.forEach((n: any, i: number) => n.props.onLayout({ nativeEvent: { layout: { x: 0, y: i < 2 ? 0 : 240, width: 200, height: 230 } } }))
    })
    expect(scrollTo).toHaveBeenCalledWith({ y: 240, animated: false })
  })

  test('the large result text is centred so a wrapped second line stays centred in the panel', () => {
    const screen = renderTable(LARGE_LANDSCAPE)
    setPhase({ ...PLAYING, phase: 'result', dealerHand: [c('K'), c('7')], lastOutcome: 'blackjack', lastDelta: 37.5 })
    expect(flat(screen.getByText(/Blackjack!/).props.style).textAlign).toBe('center')
  })

  test('the large Clear label stays on one line, shrinking if it has to', () => {
    const screen = renderTable(LARGE_LANDSCAPE)
    const clear = within(screen.getByTestId('bj-panel')).getByText('Clear')
    expect(clear.props.numberOfLines).toBe(1)
    expect(clear.props.adjustsFontSizeToFit).toBe(true)
  })
})

describe('Assist info', () => {
  test('an ⓘ sits left of Assist and opens what Assist shows, with Assist on or off', () => {
    const screen = renderTable()
    const order = screen.getAllByText(/^(ⓘ|Assist)/).map(n => String([].concat(n.props.children)[0]))
    expect(order).toEqual(['ⓘ', 'Assist: '])
    expect(screen.queryByTestId('assist-info')).toBeNull()
    fireEvent.press(screen.getByTestId('assist-info-button'))
    const info = screen.getByTestId('assist-info')
    expect(info).toHaveTextContent(/basic strategy/)
    expect(info).toHaveTextContent(/gold outline/i)
    expect(info).toHaveTextContent(/dealer's up card/)
    expect(useBlackjackStore.getState().assistEnabled).toBe(false)
    fireEvent.press(screen.getByTestId('assist-info-close'))
    expect(screen.queryByTestId('assist-info')).toBeNull()
  })

  test('the card doesn’t take touches, so its text scrolls', () => {
    const screen = renderTable(LARGE_LANDSCAPE)
    fireEvent.press(screen.getByTestId('assist-info-button'))
    expect(screen.getByTestId('assist-info').props.onStartShouldSetResponder).toBeUndefined()
  })
})
