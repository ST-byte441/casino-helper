jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
import 'react-native-gesture-handler/jestSetup'

import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { render as rtlRender, fireEvent, within, act } from '@testing-library/react-native'
import { RouletteSetup } from '../../features/roulette/components/RouletteSetup'
import { Board } from '../../features/roulette/components/Board'
import { BettingTable, applyDrop, dragEndAction } from '../../features/roulette/components/BettingTable'
import { ResultPanel } from '../../features/roulette/components/ResultPanel'
import { buildLayout } from '../../features/roulette/layout'
import { useRouletteStore } from '../../features/roulette/store'
import { useProfileStore } from '../../features/profile/store'
import { emptyStats } from '../../features/profile/stats'

// gesture-handler 3 requires every GestureDetector to sit inside a GestureHandlerRootView.
const render: typeof rtlRender = (ui, options) => rtlRender(ui, { wrapper: GestureHandlerRootView, ...options })

const store = () => useRouletteStore.getState()

beforeEach(() => {
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance: 1000, createdAt: 0, startingBalance: 1000, trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
  })
  store().setSettings({ wheel: 'double', speed: 'slow' })
})

afterEach(() => jest.restoreAllMocks())

describe('RouletteSetup', () => {
  test('Triple zero, Fast, Play starts with those settings', () => {
    const onStart = jest.fn()
    const { getByText } = render(<RouletteSetup initial={{ wheel: 'double', speed: 'slow' }} onStart={onStart} />)
    expect(getByText('Roulette Table')).toBeTruthy()
    fireEvent.press(getByText('Triple zero'))
    fireEvent.press(getByText('Fast'))
    fireEvent.press(getByText('Play'))
    expect(onStart).toHaveBeenCalledWith({ wheel: 'triple', speed: 'fast' })
  })

  test('wheel note follows the selected wheel', () => {
    const { getByText } = render(<RouletteSetup initial={{ wheel: 'double', speed: 'slow' }} onStart={jest.fn()} />)
    expect(getByText('0, 00 · 5.26% house edge')).toBeTruthy()
    fireEvent.press(getByText('Single zero'))
    expect(getByText('0 · 2.70% house edge')).toBeTruthy()
    fireEvent.press(getByText('Triple zero'))
    expect(getByText('0, 00, 000 · 7.69% house edge')).toBeTruthy()
    expect(getByText('Slow shows the ball animation')).toBeTruthy()
  })
})

describe('Board', () => {
  const layout = buildLayout('double', 'portrait', 300, 600)

  test('draws a stack with its total at the bet anchor', () => {
    const { getByTestId } = render(<Board layout={layout} bets={{ 'split:17-20': 6 }} marker={null} highlight={null} />)
    const stack = getByTestId('stack-split:17-20')
    expect(within(stack).getByText('$6')).toBeTruthy()
  })

  test('marker renders only when set', () => {
    const { queryByTestId, rerender } = render(<Board layout={layout} bets={{}} marker={null} highlight={null} />)
    expect(queryByTestId('roulette-marker')).toBeNull()
    rerender(<Board layout={layout} bets={{}} marker={17} highlight={null} />)
    expect(queryByTestId('roulette-marker')).toBeTruthy()
  })
})

describe('BettingTable', () => {
  const renderTable = (onSpin = jest.fn()) =>
    render(<BettingTable wheel="double" orientation="portrait" onSpin={onSpin} />)

  test('short outside bet shows the reason and disables Spin', () => {
    useRouletteStore.setState({ bets: { red: 5 } })
    const onSpin = jest.fn()
    const { getByText, getByTestId } = renderTable(onSpin)
    expect(getByText('Outside bets need $10 each')).toBeTruthy()
    expect(getByTestId('roulette-spin')).toBeDisabled()
    fireEvent.press(getByText('Spin'))
    expect(onSpin).not.toHaveBeenCalled()
  })

  test('valid bet enables Spin, shows the total, and Spin calls onSpin', () => {
    useRouletteStore.setState({ bets: { red: 10 } })
    const onSpin = jest.fn()
    const { getByText, getByTestId } = renderTable(onSpin)
    expect(getByText('Bet $10')).toBeTruthy()
    expect(getByTestId('roulette-spin')).toBeEnabled()
    fireEvent.press(getByText('Spin'))
    expect(onSpin).toHaveBeenCalledTimes(1)
  })

  test('tray shows the four chips', () => {
    const { getByTestId } = renderTable()
    for (const a of [1, 5, 25, 100]) expect(getByTestId(`chip-${a}`)).toBeTruthy()
  })

  test('Undo and Clear call the store', () => {
    store().placeChip('red', 5)
    store().placeChip('red', 5)
    store().placeChip('black', 25)
    const { getByText } = renderTable()
    fireEvent.press(getByText('Undo'))
    expect(store().bets).toEqual({ red: 10 })
    fireEvent.press(getByText('Clear'))
    expect(store().bets).toEqual({})
  })
})

describe('applyDrop', () => {
  test('place, move and remove map to the store actions', () => {
    applyDrop({ type: 'place', betId: 'straight:17', amount: 5 })
    expect(store().bets).toEqual({ 'straight:17': 5 })
    applyDrop({ type: 'move', from: 'straight:17', to: 'split:17-20' })
    expect(store().bets).toEqual({ 'split:17-20': 5 })
    applyDrop({ type: 'none' })
    expect(store().bets).toEqual({ 'split:17-20': 5 })
    applyDrop({ type: 'remove', betId: 'split:17-20' })
    expect(store().bets).toEqual({})
  })
})

describe('dragEndAction', () => {
  const layout = buildLayout('double', 'portrait', 300, 600)
  const origin = { x: 40, y: 100 }
  // Window coordinates of the centre of straight:17 for a board drawn at `origin`.
  const c17 = layout.anchors['straight:17']
  const abs17 = { x: c17.x + origin.x, y: c17.y + origin.y }
  const end = (success: boolean, source: Parameters<typeof dragEndAction>[0]['source'], p = abs17) =>
    applyDrop(dragEndAction({ success, layout, wheel: 'double', source, origin, absX: p.x, absY: p.y }))

  test('a cancelled tray drag places nothing', () => {
    end(false, { type: 'tray', amount: 5 })
    expect(store().bets).toEqual({})
  })

  test('a cancelled stack drag off the board leaves the stack where it was', () => {
    store().placeChip('red', 10)
    end(false, { type: 'stack', betId: 'red' }, { x: -50, y: -50 })
    expect(store().bets).toEqual({ red: 10 })
  })

  test('a finished tray drag places a chip, converting window to board coordinates', () => {
    end(true, { type: 'tray', amount: 5 })
    expect(store().bets).toEqual({ 'straight:17': 5 })
  })

  test('the board origin is subtracted: the same window point with origin 0,0 lands elsewhere', () => {
    const action = dragEndAction({ success: true, layout, wheel: 'double', source: { type: 'tray', amount: 5 },
      origin: { x: 0, y: 0 }, absX: abs17.x, absY: abs17.y })
    expect(action).not.toEqual({ type: 'place', betId: 'straight:17', amount: 5 })
  })

  test('no layout or no source is none', () => {
    expect(dragEndAction({ success: true, layout: null, wheel: 'double', source: { type: 'tray', amount: 5 },
      origin, absX: abs17.x, absY: abs17.y })).toEqual({ type: 'none' })
    expect(dragEndAction({ success: true, layout, wheel: 'double', source: null,
      origin, absX: abs17.x, absY: abs17.y })).toEqual({ type: 'none' })
  })
})

describe('BettingTable balance notice', () => {
  const setBalance = (balance: number) =>
    useProfileStore.setState(s => ({ profiles: [{ ...s.profiles[0], balance }] }))

  test('a chip rejected for balance shows Not enough balance', () => {
    setBalance(20)
    const { getByText, queryByText } = render(<BettingTable wheel="double" orientation="portrait" onSpin={jest.fn()} />)
    expect(getByText('Place a bet')).toBeTruthy()
    act(() => applyDrop({ type: 'place', betId: 'red', amount: 25 }))
    expect(getByText('Not enough balance')).toBeTruthy()
    act(() => applyDrop({ type: 'place', betId: 'red', amount: 10 }))
    expect(queryByText('Not enough balance')).toBeNull()
    expect(getByText('Bet $10')).toBeTruthy()
  })

  test('a broke profile sees Not enough balance, Spin stays disabled', () => {
    setBalance(0)
    const { getByText, getByTestId } = render(<BettingTable wheel="double" orientation="portrait" onSpin={jest.fn()} />)
    expect(getByText('Not enough balance')).toBeTruthy()
    expect(getByTestId('roulette-spin')).toBeDisabled()
  })
})

describe('ResultPanel', () => {
  test('shows the pocket label and signed net, Back to table calls onBack', () => {
    const onBack = jest.fn()
    const { getByText } = render(<ResultPanel result={-1} net={340} onBack={onBack} />)
    expect(getByText('00')).toBeTruthy()
    expect(getByText('+$340')).toBeTruthy()
    fireEvent.press(getByText('Back to table'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  test('loss and break-even copy', () => {
    const { getByText, rerender } = render(<ResultPanel result={17} net={-25} onBack={jest.fn()} />)
    expect(getByText('-$25')).toBeTruthy()
    rerender(<ResultPanel result={17} net={0} onBack={jest.fn()} />)
    expect(getByText('Even')).toBeTruthy()
  })
})
