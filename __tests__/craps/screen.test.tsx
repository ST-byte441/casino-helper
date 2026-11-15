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

// ---- View switching, rotation and large sizes ----
const { createGestureController, getByGestureTestId } = require('react-native-gesture-handler/jest-utils')
const { act } = require('@testing-library/react-native')
const { pickCrapsView } = require('../../app/craps')
const { useOrientationStore } = require('../../lib/orientation')

function seedFresh(state: Parameters<typeof seedTable>[0]) {
  seedTable(state)
  useCrapsStore.setState({ notice: null, selectedChip: null, assistEnabled: false })
}

/** The drawn width of the $5 tray chip (the ChipFace inside its drag handle). */
function chipWidth(getByTestId: (id: string) => any): number {
  const { StyleSheet } = require('react-native')
  const [face] = getByTestId('chip-5').findAll((n: any) => n !== undefined && typeof n.type === 'string'
    && StyleSheet.flatten(n.props.style)?.width != null)
  return StyleSheet.flatten(face.props.style).width
}

describe('pickCrapsView', () => {
  test.each([
    ['compact', 'portrait', 'list'],
    ['regular', 'portrait', 'list'],
    ['compact', 'landscape', 'table'],
    ['regular', 'landscape', 'table'],
    ['large', 'portrait', 'table'],
    ['large', 'landscape', 'table'],
  ])('%s %s → %s', (sizeClass, orientation, view) => {
    expect(pickCrapsView(sizeClass, orientation)).toBe(view)
  })
})

describe('view switching', () => {
  test('PHONE shows the list', () => {
    seedFresh({})
    const { queryByTestId } = render(<CrapsScreen />)
    expect(queryByTestId('craps-rotate-hint')).toBeTruthy()
    expect(queryByTestId('craps-board')).toBeNull()
  })

  test.each([
    ['PHONE_LANDSCAPE', PHONE_LANDSCAPE],
    ['FOLD_COVER_LANDSCAPE', FOLD_COVER_LANDSCAPE],
    ['LARGE_PORTRAIT', LARGE_PORTRAIT],
    ['LARGE_LANDSCAPE', LARGE_LANDSCAPE],
  ])('%s shows the table', (_name, win) => {
    setWindow(win)
    seedFresh({})
    const { queryByTestId } = render(<CrapsScreen />)
    expect(queryByTestId('craps-board')).toBeTruthy()
    expect(queryByTestId('craps-rotate-hint')).toBeNull()
  })

  test('LARGE_PORTRAIT puts the tray and the reason line below the felt, with large chips', () => {
    setWindow(LARGE_PORTRAIT)
    seedFresh({})
    const { getByTestId } = render(<CrapsScreen />)
    expect(getByTestId('craps-table-below')).toBeTruthy()
    expect(getByTestId('craps-reason')).toBeTruthy()
    expect(chipWidth(getByTestId)).toBe(55)
  })

  test('LARGE_LANDSCAPE uses large chips; PHONE_LANDSCAPE keeps 44', () => {
    setWindow(LARGE_LANDSCAPE)
    seedFresh({})
    const large = render(<CrapsScreen />)
    expect(chipWidth(large.getByTestId)).toBe(55)
    large.unmount()
    setWindow(PHONE_LANDSCAPE)
    seedFresh({})
    const phone = render(<CrapsScreen />)
    expect(chipWidth(phone.getByTestId)).toBe(44)
  })
})

describe('rotation', () => {
  test('requests rotation once setup is done, withdraws it on unmount', () => {
    useOrientationStore.setState({ rotationRequested: false })
    useCrapsStore.setState({ phase: 'setup' })
    const utils = render(<CrapsScreen />)
    expect(useOrientationStore.getState().rotationRequested).toBe(false)
    act(() => { seedFresh({}) })
    expect(useOrientationStore.getState().rotationRequested).toBe(true)
    utils.unmount()
    expect(useOrientationStore.getState().rotationRequested).toBe(false)
  })

  test('PHONE → PHONE_LANDSCAPE → PHONE keeps bets and point, and leaves no ghost chip', () => {
    seedFresh({
      phase: 'point', point: 6,
      bets: [bet('pass', 10, { odds: 20 }), bet('come', 5, { comePoint: 8, odds: 10 }), bet('place', 12, { number: 5 })],
    })
    const before = { bets: useCrapsStore.getState().bets, point: useCrapsStore.getState().point }
    const utils = render(<CrapsScreen />)
    setWindow(PHONE_LANDSCAPE)
    utils.rerender(<CrapsScreen />)
    expect(utils.queryByTestId('craps-board')).toBeTruthy()
    // A drag under way when the phone rotates back.
    const pan = createGestureController(getByGestureTestId('drag-chip-25'))
    act(() => {
      pan.begin({ x: 5, y: 5 })
      pan.activate({ x: 40, y: 40 })
      pan.update({ x: 60, y: 60 })
    })
    act(() => { jest.runOnlyPendingTimers() })
    expect(utils.queryByTestId('chip-ghost')).toBeTruthy()
    setWindow(PHONE)
    utils.rerender(<CrapsScreen />)
    expect(utils.queryByTestId('craps-rotate-hint')).toBeTruthy()
    expect(utils.queryByTestId('chip-ghost')).toBeNull()
    expect(useCrapsStore.getState().bets).toEqual(before.bets)
    expect(useCrapsStore.getState().point).toBe(before.point)
  })
})
