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
import { placeFromSheet } from '../../features/craps/components/table/MoreBetsSheet'
import { QUALITY_COLORS, feltStacks } from '../../features/craps/components/table/CrapsFelt'
import { buildCrapsLayout, tableFeltSize, SpotKey } from '../../features/craps/layout'
import { useCrapsStore } from '../../features/craps/store'
import { ROLL_ANIM_MS } from '../../features/craps/components/table/RollOverlay'
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

  test('COME tapped twice in one roll: one $10 come bet, one stack', async () => {
    seed({ phase: 'point', point: 6 })
    await mount()
    await tap('tap-chip-5')
    await tap('tap-board', anchor('come'))
    await tap('tap-board', anchor('come'))
    expect(store().bets).toEqual([expect.objectContaining({ type: 'come', amount: 10 })])
    expect(feltStacks(L, store().bets, store().point)).toHaveLength(1)
  })

  test("with World down, a $25 tap at HARD 8's inner corner places a $25 Hard 8", async () => {
    const world = bet('world', 5)
    seed({ phase: 'point', point: 6, bets: [world] })
    await mount()
    await tap('tap-chip-25')
    const h8 = L.areas.find(a => a.key === 'hard:8')!.rect
    await tap('tap-board', { x: h8.x + 2, y: h8.y + h8.h - 2 }) // where HARD 10, HARD 8, 3 and 12 meet
    expect(store().bets).toEqual([world, expect.objectContaining({ type: 'hardway', number: 8, amount: 25 })])
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

  test('dragging a contract bet off the felt says why it stays', async () => {
    const pass = bet('pass', 10)
    const come = bet('come', 5, { comePoint: 8 })
    seed({ phase: 'point', point: 6, bets: [pass, come] })
    const { getByTestId } = await mount()
    await drag(`drag-stack-handle-${pass.id}`, { x: -100, y: -100 })
    expect(getByTestId('craps-reason').props.children).toBe('Pass is a contract bet once the point is set')
    await drag(`drag-stack-handle-${come.id}`, { x: -100, y: -100 })
    expect(getByTestId('craps-reason').props.children).toBe('Come bets stay until they win or lose')
    expect(store().bets).toHaveLength(2)
  })
})

describe('CrapsTable chrome', () => {
  async function rollNatural() {
    // The place bet (off on the come-out) stays up after the roll, so ROLL stays enabled for a bet.
    seed({ bets: [bet('pass', 5), bet('place', 6, { number: 6, working: false })] })
    const utils = await mount({ onRoll: () => store().roll() })
    jest.useFakeTimers()
    // 3 + 4: natural. The store rolls first, then the overlay picks its tumbling faces.
    jest.spyOn(Math, 'random').mockReturnValueOnce(2.5 / 6).mockReturnValueOnce(3.5 / 6)
    fireEvent.press(utils.getByText('ROLL'))
    return utils
  }
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

  test('ROLL resolves the bets at once and shows the rolling dice overlay, landing on the roll', async () => {
    const { getByTestId, queryByText } = await rollNatural()
    expect(store().dice).toEqual([3, 4])
    expect(store().lastRoll?.phaseChange).toBe('natural')
    expect(getByTestId('craps-roll-overlay')).toBeTruthy()
    expect(getByTestId('roll-die-0').props.accessibilityLabel).toBe('Die showing 3')
    expect(getByTestId('roll-die-1').props.accessibilityLabel).toBe('Die showing 4')
    expect(queryByText('Natural!')).toBeNull()
    expect(getByTestId('craps-roll')).toBeDisabled()
  })

  test('the dice rest on the result, then the overlay gives way to the result banner', async () => {
    const { queryByTestId, getByText, queryByText, getByTestId } = await rollNatural()
    act(() => { jest.advanceTimersByTime(ROLL_ANIM_MS - 100) })
    expect(queryByTestId('craps-roll-overlay')).toBeTruthy()
    expect(queryByText('Natural!')).toBeNull()
    act(() => { jest.advanceTimersByTime(200) })
    expect(queryByTestId('craps-roll-overlay')).toBeNull()
    expect(getByText('Natural!')).toBeTruthy()
    expect(store().bets.length).toBeGreaterThan(0)
    expect(getByTestId('craps-roll')).not.toBeDisabled()
  })

  test('during the overlay the felt, dice block and balance still show the pre-roll state', async () => {
    // Previous dice 2 + 3; this roll is 3 + 4, a natural: the $5 Pass is paid (+$5) and taken down.
    seed({ bets: [bet('pass', 5), bet('place', 6, { number: 6, working: false })] })
    useCrapsStore.setState({ dice: [2, 3] })
    const utils = await mount({ onRoll: () => store().roll() })
    jest.useFakeTimers()
    jest.spyOn(Math, 'random').mockReturnValueOnce(2.5 / 6).mockReturnValueOnce(3.5 / 6)
    const { getByTestId, queryByTestId, getByText, queryByText } = utils
    // $1,000 less the $5 Pass and the $6 Place on the table.
    expect(getByText('$989')).toBeTruthy()
    fireEvent.press(getByText('ROLL'))
    expect(store().bets.map(b => b.type)).toEqual(['place'])
    expect(useProfileStore.getState().profiles[0].balance).toBe(1005)
    // Still the pre-roll picture.
    expect(queryByTestId('stack-pass-5-')).toBeTruthy()
    expect(getByTestId('craps-dice')).toHaveTextContent(/= 5/)
    expect(getByText('$989')).toBeTruthy()
    expect(queryByText('$999')).toBeNull()
    act(() => { jest.advanceTimersByTime(ROLL_ANIM_MS + 100) })
    // The Pass came down with its $5 win: $1,005 settled less the $6 Place still up.
    expect(getByText('$999')).toBeTruthy()
    expect(queryByTestId('stack-pass-5-')).toBeNull()
    expect(getByTestId('craps-dice')).toHaveTextContent(/= 7/)
  })

  test('a point-setting roll moves the puck only once the dice land', async () => {
    seed({ bets: [bet('pass', 5)] })
    const utils = await mount({ onRoll: () => store().roll() })
    jest.useFakeTimers()
    jest.spyOn(Math, 'random').mockReturnValueOnce(1.5 / 6).mockReturnValueOnce(3.5 / 6) // 2 + 4: point 6
    fireEvent.press(utils.getByText('ROLL'))
    expect(store().point).toBe(6)
    expect(utils.queryByTestId('puck-off')).toBeTruthy()
    expect(utils.queryByTestId('puck-on')).toBeNull()
    fireEvent.press(utils.getByTestId('craps-roll-overlay'))
    expect(utils.queryByTestId('puck-on')).toBeTruthy()
  })

  test('no chips go down while the dice roll, and More bets is disabled', async () => {
    seed({ bets: [bet('pass', 5), bet('place', 6, { number: 6, working: false })] })
    jest.spyOn(Math, 'random').mockReturnValueOnce(2.5 / 6).mockReturnValueOnce(3.5 / 6)
    const { getByText, getByTestId } = await mount({ onRoll: () => store().roll() })
    fireEvent.press(getByText('ROLL'))
    expect(getByTestId('craps-roll-overlay')).toBeTruthy()
    const before = store().bets
    await drag('drag-chip-5', anchor('field'))
    await tap('tap-chip-5')
    await tap('tap-board', anchor('field'))
    expect(store().bets).toEqual(before)
    expect(getByTestId('craps-more-bets')).toBeDisabled()
  })

  test('a ROLL the store refuses starts no overlay and replays no old roll', async () => {
    seed({ bets: [bet('pass', 5)] })
    useCrapsStore.setState({ dice: [2, 3] })
    const { getByText, queryByTestId, getByTestId } = await mount() // onRoll does nothing
    fireEvent.press(getByText('ROLL'))
    expect(queryByTestId('craps-roll-overlay')).toBeNull()
    expect(getByTestId('craps-roll')).not.toBeDisabled()
  })

  test('tapping the overlay skips to the result', async () => {
    const { getByTestId, queryByTestId, getByText } = await rollNatural()
    fireEvent.press(getByTestId('craps-roll-overlay'))
    expect(queryByTestId('craps-roll-overlay')).toBeNull()
    expect(getByText('Natural!')).toBeTruthy()
  })

  test('the dice and ROLL sit in the dice block at the Pass Line\'s right end, ROLL at least 44dp tall', async () => {
    const { getByTestId } = await mount()
    const box = StyleSheet.flatten(getByTestId('craps-dice').props.style)
    expect(box).toMatchObject({ left: L.diceRect.x, top: L.diceRect.y, width: L.diceRect.w, height: L.diceRect.h,
      flexDirection: 'row' })
    const roll = StyleSheet.flatten(getByTestId('craps-roll').props.style)
    expect(roll.minHeight).toBeGreaterThanOrEqual(44)
    expect(roll.margin ?? 0).toBe(0)
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

  test('the header balance is the bankroll less the chips on the table', async () => {
    const { getByTestId } = await mount()
    expect(getByTestId('craps-balance')).toHaveTextContent('$1,000')
    await act(async () => { store().placeBet('field', 10) })
    expect(getByTestId('craps-balance')).toHaveTextContent('$990')
    await act(async () => { store().placeBet('pass', 25) })
    expect(getByTestId('craps-balance')).toHaveTextContent('$965')
    await act(async () => { store().removeBet(store().bets.find(b => b.type === 'field')!.id) })
    expect(getByTestId('craps-balance')).toHaveTextContent('$975')
    // The settled bankroll never moved.
    expect(useProfileStore.getState().profiles[0].balance).toBe(1000)
  })
})

describe('Stack menu', () => {
  async function openMenu(b: ActiveBet) {
    const utils = await mount()
    await tap('tap-board', stackAt(b.id))
    return utils
  }

  test('pass after the point: no Take down, has Odds', async () => {
    const pass = bet('pass', 10)
    seed({ phase: 'point', point: 6, bets: [pass] })
    const { queryByTestId, getByTestId } = await openMenu(pass)
    expect(getByTestId('stack-menu-title').props.children).toBe('Pass $10')
    expect(queryByTestId('stack-take-down')).toBeNull()
    expect(getByTestId('stack-odds-plus-1')).toBeTruthy()
  })

  const disabled = (node: any) => node.props.accessibilityState?.disabled === true

  test('Odds steps of $1, $5 and $25, each disabled once it would pass the cap', async () => {
    const pass = bet('pass', 10)
    seed({ phase: 'point', point: 4, bets: [pass] }) // 3x at 4 = $30
    const { getByTestId } = await openMenu(pass)
    expect(disabled(getByTestId('stack-odds-plus-25'))).toBe(false)
    fireEvent.press(getByTestId('stack-odds-plus-25'))
    expect(store().bets[0].odds).toBe(25)
    expect(disabled(getByTestId('stack-odds-plus-25'))).toBe(true) // 25 + 25 > 30
    expect(disabled(getByTestId('stack-odds-plus-5'))).toBe(false)
    fireEvent.press(getByTestId('stack-odds-plus-5'))
    expect(store().bets[0].odds).toBe(30)
    for (const n of [1, 5, 25]) expect(disabled(getByTestId(`stack-odds-plus-${n}`))).toBe(true)
    fireEvent.press(getByTestId('stack-odds-minus-5'))
    expect(store().bets[0].odds).toBe(25)
    fireEvent.press(getByTestId('stack-odds-minus-1'))
    expect(store().bets[0].odds).toBe(24)
    fireEvent.press(getByTestId('stack-odds-minus-25'))
    expect(store().bets[0].odds).toBe(0)
    for (const n of [1, 5, 25]) expect(disabled(getByTestId(`stack-odds-minus-${n}`))).toBe(true)
  })

  test('an odds step the balance cannot cover is disabled', async () => {
    useProfileStore.setState(s => ({ profiles: s.profiles.map(p => ({ ...p, balance: 20 })) }))
    const pass = bet('pass', 10)
    seed({ phase: 'point', point: 6, bets: [pass] }) // cap $50, but only $10 of balance is free
    const { getByTestId } = await openMenu(pass)
    expect(disabled(getByTestId('stack-odds-plus-5'))).toBe(false)
    expect(disabled(getByTestId('stack-odds-plus-25'))).toBe(true)
    fireEvent.press(getByTestId('stack-odds-plus-5'))
    fireEvent.press(getByTestId('stack-odds-plus-5'))
    expect(store().bets[0].odds).toBe(10)
    expect(disabled(getByTestId('stack-odds-plus-1'))).toBe(true)
  })

  test('the menu shows the store notice on its own line, cleared when it opens', async () => {
    const place = bet('place', 6, { number: 6 })
    seed({ phase: 'point', point: 5, bets: [place] })
    useCrapsStore.setState({ notice: 'old news' })
    const { getByTestId } = await openMenu(place)
    expect(getByTestId('stack-menu-notice').props.children).toBe(' ')
    await act(async () => { store().setNotice('Not enough balance') })
    expect(getByTestId('stack-menu-notice').props.children).toBe('Not enough balance')
  })

  test('Off on a place bet sets working false', async () => {
    const place = bet('place', 6, { number: 6 })
    seed({ phase: 'point', point: 5, bets: [place] })
    const { getAllByText } = await openMenu(place)
    fireEvent.press(getAllByText('ON').slice(-1)[0]) // the menu's toggle renders last
    expect(store().bets[0].working).toBe(false)
  })

  test('Take down removes a place bet and closes the menu', async () => {
    const place = bet('place', 6, { number: 6 })
    seed({ phase: 'point', point: 5, bets: [place] })
    const { getByTestId, queryByTestId } = await openMenu(place)
    fireEvent.press(getByTestId('stack-take-down'))
    expect(store().bets).toEqual([])
    expect(queryByTestId('stack-menu-title')).toBeNull()
  })

  test('a come point caps its odds against its own comePoint', async () => {
    const come = bet('come', 5, { comePoint: 4, odds: 10 }) // point 6 would allow $25; 4 allows $15
    seed({ phase: 'point', point: 6, bets: [come] })
    const { getByTestId } = await openMenu(come)
    expect(disabled(getByTestId('stack-odds-plus-5'))).toBe(false)
    fireEvent.press(getByTestId('stack-odds-plus-1'))
    expect(store().bets[0].odds).toBe(11)
    expect(disabled(getByTestId('stack-odds-plus-5'))).toBe(true) // 11 + 5 > 15
    await act(async () => { useCrapsStore.setState({ bets: [{ ...come, odds: 15 }] }) })
    expect(disabled(getByTestId('stack-odds-plus-1'))).toBe(true)
  })
})

describe('More bets sheet', () => {
  async function openSheet() {
    const utils = await mount()
    fireEvent.press(utils.getByTestId('craps-more-bets'))
    return utils
  }

  test('places Buy 6 at the $20 minimum and a hop', async () => {
    seed({ phase: 'point', point: 5 })
    const { getByText, getAllByText } = await openSheet()
    fireEvent.press(getAllByText('+$20')[2]) // Buy 4, Buy 5, Buy 6
    expect(store().bets).toEqual([expect.objectContaining({ type: 'buy', number: 6, amount: 20 })])
    fireEvent.press(getByText('1-2'))
    expect(store().bets[1]).toEqual(expect.objectContaining({ type: 'hop-easy', amount: 1, hopDice: [1, 2] }))
  })

  test('opening the sheet clears a stale notice', async () => {
    useCrapsStore.setState({ notice: 'Come bets open once a point is set' })
    const { getByTestId } = await openSheet()
    expect(store().notice).toBeNull()
    expect(getByTestId('more-bets-notice').props.children).toBe(' ')
  })

  test('World refuses $3 with a notice shown in the sheet', async () => {
    const { getByTestId } = await openSheet()
    let placed = true
    await act(async () => { placed = placeFromSheet('world', 3) })
    expect(placed).toBe(false)
    expect(store().bets).toEqual([])
    await flush()
    expect(getByTestId('more-bets-notice').props.children).toBeTruthy()
    expect(getByTestId('more-bets-notice').props.children).not.toBe(' ')
  })
})

describe('Large table', () => {
  const { dragLift } = require('../../components/chips/chips')
  const LG = tableFeltSize(884, 673, 'large')
  const LL = buildCrapsLayout('craps', LG.width, LG.height)

  test('a dragged 55dp chip is lifted by its own size and lands where it is drawn', async () => {
    const utils = render(<CrapsTable size="large" onRoll={jest.fn()} />)
    fireEvent(utils.getByTestId('craps-board'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: LG.width, height: LG.height } } })
    await flush()
    // 1dp above the Field's bottom edge: the 44dp lift (2.75dp less) would drop it on Don't Pass below.
    const f = LL.areas.find(a => a.key === 'field')!.rect
    const p = { x: f.x + f.w / 2, y: f.y + f.h - 1 }
    const rel = { x: p.x, y: p.y + dragLift(55) }
    fireGestureHandler(getByGestureTestId('drag-chip-5'), [
      { state: State.BEGAN, x: 5, y: 5 },
      { state: State.ACTIVE, x: rel.x, y: rel.y },
      { state: State.END, x: rel.x, y: rel.y },
    ])
    await flush()
    expect(store().bets).toEqual([expect.objectContaining({ type: 'field', amount: 5 })])
  })
})
