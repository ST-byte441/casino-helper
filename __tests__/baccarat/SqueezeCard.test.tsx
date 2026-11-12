jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
import 'react-native-gesture-handler/jestSetup'
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SqueezeCard } from '../../features/baccarat/components/SqueezeCard'
import { Card } from '../../lib/types'

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

describe('card face layout', () => {
  const { pipBoxes, CORNER_BOXES, CARD_SIZE } = require('../../features/baccarat/components/SqueezeCard')
  type Box = { left: number; top: number; width: number; height: number }
  const overlaps = (a: Box, b: Box) =>
    a.left < b.left + b.width && b.left < a.left + a.width &&
    a.top < b.top + b.height && b.top < a.top + a.height

  const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10']

  test.each(VALUES)('%s: no pip touches either corner index', value => {
    for (const pip of pipBoxes(value) as Box[]) {
      for (const corner of CORNER_BOXES as Box[]) expect(overlaps(pip, corner)).toBe(false)
    }
  })

  test.each(VALUES)('%s: pips stay on the card and do not overlap each other', value => {
    const pips = pipBoxes(value) as Box[]
    pips.forEach((p, i) => {
      expect(p.left).toBeGreaterThanOrEqual(0)
      expect(p.top).toBeGreaterThanOrEqual(0)
      expect(p.left + p.width).toBeLessThanOrEqual(CARD_SIZE.width)
      expect(p.top + p.height).toBeLessThanOrEqual(CARD_SIZE.height)
      pips.slice(i + 1).forEach(q => expect(overlaps(p, q)).toBe(false))
    })
  })

  test('court cards have no pips', () => expect(pipBoxes('K')).toEqual([]))
})
