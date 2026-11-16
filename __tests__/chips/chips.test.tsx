jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
import 'react-native-gesture-handler/jestSetup'

import React, { useState } from 'react'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { render as rtlRender, act } from '@testing-library/react-native'
import { CHIP_SIZE, DRAG_LIFT, FINGERTIP_REACH, dragLift, dragPoint, fingerInWindow, stackChip } from '../../components/chips/chips'
import { ChipTray } from '../../components/chips/ChipTray'
import { ChipHandlers } from '../../components/chips/DragHandle'

const { fireGestureHandler, getByGestureTestId } = require('react-native-gesture-handler/jest-utils')

// gesture-handler 3 requires every GestureDetector to sit inside a GestureHandlerRootView.
const render: typeof rtlRender = (ui, options) => rtlRender(ui, { wrapper: GestureHandlerRootView, ...options })
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

const CHIPS = [1, 5, 25, 100] as const

function makeHandlers(): ChipHandlers {
  return {
    ghost: { x: { value: 0 }, y: { value: 0 }, origin: { value: { x: 0, y: 0 } } } as unknown as ChipHandlers['ghost'],
    onBegin: jest.fn(), onMove: jest.fn(), onDrop: jest.fn(), onFinish: jest.fn(),
  }
}

/** Holds the selection like a game store would (tapping the selected chip again deselects it). */
function Tray({ handlers }: { handlers: ChipHandlers }) {
  const [selected, setSelected] = useState<number | null>(null)
  return <ChipTray chips={CHIPS} selected={selected} handlers={handlers}
    onSelect={a => setSelected(s => (s === a ? null : a))} />
}

async function tap(id: string) {
  fireGestureHandler(getByGestureTestId(id), [
    { state: State.BEGAN, x: 22, y: 22 },
    { state: State.ACTIVE, x: 22, y: 22 },
    { state: State.END, x: 22, y: 22 },
  ])
  await flush()
}

describe('chip helpers', () => {
  test('dragPoint lifts the finger point by DRAG_LIFT', () => {
    expect(dragPoint({ x: 10, y: 200 })).toEqual({ x: 10, y: 200 - DRAG_LIFT })
    expect(DRAG_LIFT).toBe(FINGERTIP_REACH + CHIP_SIZE * 0.75 - CHIP_SIZE / 2)
  })

  test('a scaled chip is lifted by its own size; DRAG_LIFT is the CHIP_SIZE lift', () => {
    expect(dragLift(CHIP_SIZE)).toBe(DRAG_LIFT)
    expect(dragLift(55)).toBe(FINGERTIP_REACH + 55 * 0.75 - 55 / 2)
    expect(dragPoint({ x: 10, y: 200 }, dragLift(55))).toEqual({ x: 10, y: 200 - dragLift(55) })
  })

  test('fingerInWindow adds the handle origin to the handle-relative point', () => {
    expect(fingerInWindow({ x: 30, y: 700 }, { x: 5, y: -40 })).toEqual({ x: 35, y: 660 })
  })

  test('stackChip picks the largest chip the total covers', () => {
    expect(stackChip(1)).toBe(1)
    expect(stackChip(6)).toBe(5)
    expect(stackChip(99)).toBe(25)
    expect(stackChip(250)).toBe(100)
    expect(stackChip(0)).toBe(1)
  })
})

describe('ChipTray', () => {
  const selected = (utils: { getByTestId(id: string): any }, amount: number) =>
    utils.getByTestId(`chip-${amount}`).props.accessibilityState?.selected === true

  test('renders a chip per amount', () => {
    const utils = render(<Tray handlers={makeHandlers()} />)
    for (const a of CHIPS) expect(utils.getByTestId(`chip-${a}`)).toBeTruthy()
  })

  test('tapping toggles accessibilityState.selected through onSelect', async () => {
    const handlers = makeHandlers()
    const utils = render(<Tray handlers={handlers} />)
    expect(CHIPS.some(a => selected(utils, a))).toBe(false)
    await tap('tap-chip-5')
    expect(selected(utils, 5)).toBe(true)
    await tap('tap-chip-25')
    expect(selected(utils, 25)).toBe(true)
    expect(selected(utils, 5)).toBe(false)
    await tap('tap-chip-25')
    expect(CHIPS.some(a => selected(utils, a))).toBe(false)
    // A tap never starts a drag.
    expect(handlers.onBegin).not.toHaveBeenCalled()
  })

  test('dragging a tray chip begins a drag with its tray source', async () => {
    const handlers = makeHandlers()
    render(<Tray handlers={handlers} />)
    fireGestureHandler(getByGestureTestId('drag-chip-25'), [
      { state: State.BEGAN, x: 22, y: 22 },
      { state: State.ACTIVE, x: 22, y: -100 },
      { state: State.END, x: 22, y: -100 },
    ])
    await flush()
    expect(handlers.onBegin).toHaveBeenCalledWith({ type: 'tray', amount: 25 }, expect.any(Number), expect.any(Number))
    expect(handlers.onDrop).toHaveBeenCalledWith(true, expect.any(Number), expect.any(Number))
    expect(handlers.onFinish).toHaveBeenCalled()
  })
})
