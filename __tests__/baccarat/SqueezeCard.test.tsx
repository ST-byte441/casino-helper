jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
import 'react-native-gesture-handler/jestSetup'
import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { render as rtlRender, fireEvent } from '@testing-library/react-native'
import { SqueezeCard } from '../../features/baccarat/components/SqueezeCard'
import { Card } from '../../lib/types'

// gesture-handler 3 requires every GestureDetector to sit inside a GestureHandlerRootView.
const render: typeof rtlRender = (ui, options) => rtlRender(ui, { wrapper: GestureHandlerRootView, ...options })

const card: Card = { value: '8', suit: '♥' }

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

test('squeeze mode: Flip it ▸ reveals once', () => {
  const onRevealed = jest.fn()
  const { getByText } = render(<SqueezeCard card={card} mode="squeeze" onRevealed={onRevealed} />)
  expect(getByText('Drag up to squeeze')).toBeTruthy()
  fireEvent.press(getByText('Flip it ▸'))
  jest.advanceTimersByTime(1000)
  expect(onRevealed).toHaveBeenCalledTimes(1)
  fireEvent.press(getByText('Flip it ▸'))
  jest.advanceTimersByTime(1000)
  expect(onRevealed).toHaveBeenCalledTimes(1)
})

test('squeeze mode: does not reveal on its own', () => {
  const onRevealed = jest.fn()
  render(<SqueezeCard card={card} mode="squeeze" onRevealed={onRevealed} />)
  jest.advanceTimersByTime(5000)
  expect(onRevealed).not.toHaveBeenCalled()
})

test('flip mode: reveals automatically once, with no Flip it button', () => {
  const onRevealed = jest.fn()
  const { queryByText } = render(<SqueezeCard card={card} mode="flip" onRevealed={onRevealed} />)
  expect(queryByText('Flip it ▸')).toBeNull()
  jest.advanceTimersByTime(1000)
  expect(onRevealed).toHaveBeenCalledTimes(1)
  jest.advanceTimersByTime(1000)
  expect(onRevealed).toHaveBeenCalledTimes(1)
})

test('renders the card face image for the card', () => {
  const { cardFaceImage } = require('../../features/baccarat/cardFaces')
  const { getByTestId } = render(<SqueezeCard card={card} mode="squeeze" onRevealed={jest.fn()} />)
  expect(getByTestId('card-face').props.source).toBe(cardFaceImage(card))
})

describe('large squeeze card', () => {
  const { State } = require('react-native-gesture-handler')
  const { fireGestureHandler, getByGestureTestId } = require('react-native-gesture-handler/jest-utils')
  const { StyleSheet } = require('react-native')
  const { SQUEEZE_H } = require('../../features/baccarat/components/SqueezeCard')

  const { act } = require('@testing-library/react-native')
  // scheduleOnRN's mock queues a microtask, so flush it before advancing the reveal timer.
  const drag = async (dy: number) => {
    fireGestureHandler(getByGestureTestId('squeeze-pan'), [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: 0 }, // activation (onStart); onUpdate runs from the next event
      { state: State.ACTIVE, translationY: dy },
      { state: State.END, translationY: dy },
    ])
    await act(async () => { await Promise.resolve() })
    act(() => { jest.advanceTimersByTime(1000) })
  }

  test('is 280 tall (186 on phones)', () => {
    expect(SQUEEZE_H).toEqual({ regular: 186, large: 280 })
    const { getByTestId } = render(<SqueezeCard card={card} mode="squeeze" onRevealed={jest.fn()} size="large" />)
    let box: any = getByTestId('card-face').parent
    while (box && !(box.type === 'View' && StyleSheet.flatten(box.props.style)?.height)) box = box.parent
    expect(StyleSheet.flatten(box.props.style).height).toBe(280)
  })

  test('the peel distance scales with the card: half of a large card is not enough', async () => {
    const onRevealed = jest.fn()
    render(<SqueezeCard card={card} mode="squeeze" onRevealed={onRevealed} size="large" />)
    await drag(-0.5 * 0.9 * 280) // progress 0.5 on a 280 card (it would be 0.75 on a 186 card)
    expect(onRevealed).not.toHaveBeenCalled()
  })

  test('the same drag on a phone-size card does reveal it (so the large case is meaningful)', async () => {
    const onRevealed = jest.fn()
    render(<SqueezeCard card={card} mode="squeeze" onRevealed={onRevealed} />)
    await drag(-0.5 * 0.9 * 280)
    expect(onRevealed).toHaveBeenCalledTimes(1)
  })

  test('peeling past the threshold of a large card reveals it', async () => {
    const onRevealed = jest.fn()
    render(<SqueezeCard card={card} mode="squeeze" onRevealed={onRevealed} size="large" />)
    await drag(-0.6 * 0.9 * 280)
    expect(onRevealed).toHaveBeenCalledTimes(1)
  })

  test('large hint and Flip it text are 16 and 17', () => {
    const { getByText } = render(<SqueezeCard card={card} mode="squeeze" onRevealed={jest.fn()} size="large" />)
    expect(StyleSheet.flatten(getByText('Drag up to squeeze').props.style).fontSize).toBe(16)
    expect(StyleSheet.flatten(getByText('Flip it ▸').props.style).fontSize).toBe(17)
  })
})
