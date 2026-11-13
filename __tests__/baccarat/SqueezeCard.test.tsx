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
