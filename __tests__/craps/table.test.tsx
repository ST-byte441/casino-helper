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
import 'react-native-gesture-handler/jestSetup'

import React from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { render as rtlRender, fireEvent, act } from '@testing-library/react-native'
import { DRAG_LIFT } from '../../components/chips/chips'
import { CrapsTable } from '../../features/craps/components/table/CrapsTable'
import { QUALITY_COLORS, feltStacks } from '../../features/craps/components/table/CrapsFelt'
import { buildCrapsLayout, tableFeltSize, SpotKey } from '../../features/craps/layout'
import { useCrapsStore } from '../../features/craps/store'
import { useProfileStore } from '../../features/profile/store'
import { emptyStats } from '../../features/profile/stats'
import { ActiveBet, BetType, CrapsTableRules } from '../../lib/types'

const { fireGestureHandler, getByGestureTestId } = require('react-native-gesture-handler/jest-utils')

// gesture-handler 3 requires every GestureDetector to sit inside a GestureHandlerRootView.
const render: typeof rtlRender = (ui, options) => rtlRender(ui, { wrapper: GestureHandlerRootView, ...options })
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

// The felt's share of PHONE_LANDSCAPE (832×384) once the slim header and the tray column are taken.
const { width: FELT_W, height: FELT_H } = tableFeltSize(832, 384)
const L = buildCrapsLayout('craps', FELT_W, FELT_H)
const STANDARD: CrapsTableRules = { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false }

const store = () => useCrapsStore.getState()
const bet = (type: BetType, amount: number, extra: Partial<ActiveBet> = {}): ActiveBet =>
  ({ id: `${type}-${amount}-${extra.number ?? extra.comePoint ?? ''}`, type, amount, working: true, ...extra })

function seed(state: { phase?: 'come-out' | 'point'; point?: number | null; bets?: ActiveBet[] } = {}) {
  useCrapsStore.setState({
    phase: state.phase ?? 'come-out', point: state.point ?? null, bets: state.bets ?? [], tableRules: STANDARD,
    notice: null, selectedChip: null, dice: null, lastRoll: null, lastDelta: 0, assistEnabled: false,
  })
}

beforeEach(() => {
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance: 1000, createdAt: 0, startingBalance: 1000,
      trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
  })
  seed()
})

async function mount(props: Partial<React.ComponentProps<typeof CrapsTable>> = {}) {
  const onStackMenu = jest.fn()
  const onRoll = jest.fn()
  const utils = render(<CrapsTable size="regular" onRoll={onRoll} onStackMenu={onStackMenu} {...props} />)
  fireEvent(utils.getByTestId('craps-board'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: FELT_W, height: FELT_H } } })
  await flush()
  return { ...utils, onStackMenu, onRoll }
}

async function tap(id: string, p = { x: 22, y: 22 }) {
  fireGestureHandler(getByGestureTestId(id), [
    { state: State.BEGAN, x: p.x, y: p.y },
    { state: State.ACTIVE, x: p.x, y: p.y },
    { state: State.END, x: p.x, y: p.y },
  ])
  await flush()
}

/** Drags handle `id` (window origin 0,0: measureInWindow is not mocked) so the chip lands on board point `p`. */
async function drag(id: string, p: { x: number; y: number }) {
  const rel = { x: p.x, y: p.y + DRAG_LIFT }
  fireGestureHandler(getByGestureTestId(id), [
    { state: State.BEGAN, x: 5, y: 5 },
    { state: State.ACTIVE, x: rel.x, y: rel.y },
    { state: State.END, x: rel.x, y: rel.y },
  ])
  await flush()
}

const anchor = (key: SpotKey) => L.anchors[key]
const stackAt = (id: string) => feltStacks(L, store().bets, store().point).find(s => s.key === id)!.at

describe('CrapsTable taps', () => {
  test('select $5 and tap pass on the come-out: bets get pass $5', async () => {
    await mount()
    await tap('tap-chip-5')
    await tap('tap-board', anchor('pass'))
    expect(store().bets).toEqual([expect.objectContaining({ type: 'pass', amount: 5 })])
  })

  test('tap box:6 in the point phase: place 6 $5', async () => {
    seed({ phase: 'point', point: 5 })
    await mount()
    await tap('tap-chip-5')
    await tap('tap-board', L.boxSlots[6].place)
    expect(store().bets).toEqual([expect.objectContaining({ type: 'place', number: 6, amount: 5 })])
  })

  test('tap come on the come-out: refused, the reason line explains', async () => {
    const { getByTestId } = await mount()
    await tap('tap-chip-5')
    await tap('tap-board', anchor('come'))
    expect(store().bets).toEqual([])
    expect(getByTestId('craps-reason').props.children).toBe('Come bets open once a point is set')
  })

  test('a come bet at comePoint 8, tapped with $5 selected: odds 5', async () => {
    seed({ phase: 'point', point: 6, bets: [bet('come', 10, { comePoint: 8 })] })
    await mount()
    await tap('tap-chip-5')
    await tap('tap-board', stackAt('come-10-8'))
    expect(store().bets).toEqual([expect.objectContaining({ type: 'come', amount: 10, comePoint: 8, odds: 5 })])
  })

  test('a pass stack tapped after the point: refused with a notice', async () => {
    seed({ phase: 'point', point: 6, bets: [bet('pass', 10)] })
    const { getByTestId } = await mount()
    await tap('tap-chip-5')
    await tap('tap-board', stackAt('pass-10-'))
    expect(store().bets).toEqual([expect.objectContaining({ type: 'pass', amount: 10 })])
    expect(store().bets[0].odds).toBeUndefined()
    expect(getByTestId('craps-reason').props.children).toBe('Line bets are made on the come-out')
  })

  test('a chip on pass odds with no Pass bet explains why', async () => {
    seed({ phase: 'point', point: 6 })
    const { getByTestId } = await mount()
    await tap('tap-chip-5')
    await tap('tap-board', anchor('pass-odds'))
    expect(getByTestId('craps-reason').props.children).toBe('Make a Pass bet first')
  })

  test("a chip on don't pass odds with no Don't Pass bet explains why", async () => {
    seed({ phase: 'point', point: 6 })
    const { getByTestId } = await mount()
    await tap('tap-chip-5')
    await tap('tap-board', anchor('dont-pass-odds'))
    expect(getByTestId('craps-reason').props.children).toBe("Make a Don't Pass bet first")
  })

  test('come odds past the cap are refused on the table', async () => {
    seed({ phase: 'point', point: 6, bets: [bet('come', 5, { comePoint: 4, odds: 15 })] }) // 4: 3x = $15
    const { getByTestId } = await mount()
    await tap('tap-chip-5')
    await tap('tap-board', stackAt('come-5-4'))
    expect(store().bets[0].odds).toBe(15)
    expect(getByTestId('craps-reason').props.children).toBe('Max odds here is $15')
  })

  test('tap a stack with no chip selected: onStackMenu is called with the bet', async () => {
    const field = bet('field', 5)
    seed({ bets: [field] })
    const { onStackMenu } = await mount()
    await tap('tap-board', stackAt(field.id))
    expect(onStackMenu).toHaveBeenCalledWith(field)
    expect(store().bets).toEqual([field])
  })

  test('a $1 chip on horn places a $4 horn; a $5 chip adds $20 (chip = amount per number)', async () => {
    await mount()
    await tap('tap-chip-1')
    await tap('tap-board', anchor('horn'))
    expect(store().bets).toEqual([expect.objectContaining({ type: 'horn', amount: 4 })])
    await tap('tap-chip-5')
    await tap('tap-board', anchor('horn'))
    expect(store().bets).toEqual([expect.objectContaining({ type: 'horn', amount: 24 })])
  })
})

describe('CrapsTable drags', () => {
  test('drag a tray chip onto field: field bet', async () => {
    await mount()
    await drag('drag-chip-25', anchor('field'))
    expect(store().bets).toEqual([expect.objectContaining({ type: 'field', amount: 25 })])
  })

  test('drag a place stack off the felt: removed', async () => {
    const place = bet('place', 6, { number: 6 })
    seed({ phase: 'point', point: 5, bets: [place] })
    await mount()
    await drag(`drag-stack-handle-${place.id}`, { x: -100, y: -100 })
    expect(store().bets).toEqual([])
  })

  test('drag a place stack onto another area: nothing moves', async () => {
    const place = bet('place', 6, { number: 6 })
    seed({ phase: 'point', point: 5, bets: [place] })
    await mount()
    await drag(`drag-stack-handle-${place.id}`, anchor('field'))
    expect(store().bets).toEqual([place])
  })

  test('drag a pass stack off the felt after the point: it stays (contract bet)', async () => {
    const pass = bet('pass', 10)
    seed({ phase: 'point', point: 6, bets: [pass] })
    await mount()
    await drag(`drag-stack-handle-${pass.id}`, { x: -100, y: -100 })
    expect(store().bets).toEqual([pass])
  })
})

describe('CrapsTable chrome', () => {
  test('ROLL shows the result banner', async () => {
    seed({ bets: [bet('pass', 5)] })
    jest.spyOn(Math, 'random').mockReturnValueOnce(2.5 / 6).mockReturnValueOnce(3.5 / 6) // 3 + 4: natural
    const { getByText, queryByText } = await mount({ onRoll: () => store().roll() })
    expect(queryByText('Natural!')).toBeNull()
    fireEvent.press(getByText('ROLL'))
    expect(getByText('Natural!')).toBeTruthy()
    jest.restoreAllMocks()
  })

  test('ROLL calls onRoll', async () => {
    seed({ bets: [bet('pass', 5)] })
    const { getByText, onRoll } = await mount()
    fireEvent.press(getByText('ROLL'))
    expect(onRoll).toHaveBeenCalled()
  })

  test('Assist tints each area by its bet quality', async () => {
    const { getByTestId, getByText } = await mount()
    const border = (key: string) => StyleSheet.flatten(getByTestId(`area-${key}`).props.style).borderColor
    expect(border('field')).not.toBe(QUALITY_COLORS.poor)
    fireEvent.press(getByText('Assist ○'))
    expect(border('field')).toBe(QUALITY_COLORS.poor)
    expect(border('any-7')).toBe(QUALITY_COLORS.avoid)
  })

  test('the header shows the odds and the balance', async () => {
    const { getByText } = await mount()
    expect(getByText('CRAPS · 3-4-5x')).toBeTruthy()
    expect(getByText('$1,000')).toBeTruthy()
  })
})
