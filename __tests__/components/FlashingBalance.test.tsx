import React from 'react'
import { render, act } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { FlashingBalance, FLASH_UP, FLASH_DOWN, FLASH_MS } from '../../components/FlashingBalance'

const color = (el: any) => StyleSheet.flatten(el.props.style).color

describe('FlashingBalance', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  test('shows the text in its normal colour and does not flash on mount', () => {
    const { getByTestId } = render(<FlashingBalance testID="b" value={1000} color="#aaa">$1,000</FlashingBalance>)
    act(() => { jest.advanceTimersByTime(200) })
    expect(getByTestId('b')).toHaveTextContent('$1,000')
    expect(color(getByTestId('b'))).toBe('rgba(170, 170, 170, 1)')
  })

  test('the flash lasts 0.5 s', () => {
    expect(FLASH_MS).toBe(500)
  })

  test('flashes red when the value drops, then returns to normal', () => {
    const utils = render(<FlashingBalance testID="b" value={1000} color="#aaa">$1,000</FlashingBalance>)
    utils.rerender(<FlashingBalance testID="b" value={990} color="#aaa">$990</FlashingBalance>)
    act(() => { jest.advanceTimersByTime(200) })
    expect(color(utils.getByTestId('b'))).toBe(FLASH_DOWN)
    act(() => { jest.advanceTimersByTime(FLASH_MS) })
    expect(color(utils.getByTestId('b'))).toBe('rgba(170, 170, 170, 1)')
  })

  test('flashes green when the value rises', () => {
    const utils = render(<FlashingBalance testID="b" value={990} color="#aaa">$990</FlashingBalance>)
    utils.rerender(<FlashingBalance testID="b" value={1010} color="#aaa">$1,010</FlashingBalance>)
    act(() => { jest.advanceTimersByTime(200) })
    expect(color(utils.getByTestId('b'))).toBe(FLASH_UP)
  })

  test('no flash without a numeric value (infinite bankroll)', () => {
    const utils = render(<FlashingBalance testID="b" value={null} color="#aaa">∞</FlashingBalance>)
    utils.rerender(<FlashingBalance testID="b" value={null} color="#aaa">∞</FlashingBalance>)
    act(() => { jest.advanceTimersByTime(200) })
    expect(color(utils.getByTestId('b'))).toBe('rgba(170, 170, 170, 1)')
  })
})
