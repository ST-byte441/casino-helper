import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { HopBetGrid } from '../../features/craps/components/HopBetGrid'

test('renders all 21 hops and places a hard hop', () => {
  const onPlace = jest.fn()
  const screen = render(<HopBetGrid onPlace={onPlace} increment={5} />)
  expect(screen.getAllByText(/^\d-\d$/)).toHaveLength(21)
  fireEvent.press(screen.getByText('2-2'))
  expect(onPlace).toHaveBeenCalledWith([2, 2], true, 5)
})

test('the grid is 320 wide on phones but shrinks to fit narrower screens (no sideways scroll)', () => {
  const screen = render(<HopBetGrid onPlace={jest.fn()} increment={5} />)
  expect(screen.UNSAFE_queryByType(ScrollView)).toBeNull()
  const style = StyleSheet.flatten(screen.getByTestId('hop-grid').props.style)
  expect(style.width).toBe(320)
  expect(style.maxWidth).toBe('100%')
})
