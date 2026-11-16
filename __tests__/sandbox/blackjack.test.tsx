jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import BlackjackSandboxScreen from '../../app/sandbox/blackjack'

/** Picks a rank in the open RankPicker (its buttons render last, after any card already showing that rank). */
function pick(screen: ReturnType<typeof render>, rank: string) {
  fireEvent.press(screen.getAllByText(rank).slice(-1)[0])
}

function deal(dealer: string, player: string[]) {
  const screen = render(<BlackjackSandboxScreen />)
  fireEvent.press(screen.getByText('Tap to set'))
  pick(screen, dealer)
  for (const r of player) {
    fireEvent.press(screen.getByText('+'))
    pick(screen, r)
  }
  return screen
}

describe('Blackjack sandbox strategy', () => {
  test('two-card soft 18 (A-7) vs 5 doubles', () => {
    expect(deal('5', ['A', '7']).getByText('DOUBLE DOWN')).toBeTruthy()
  })

  test('three-card soft 18 (A-2-5) vs 5 stands: "double, else stand"', () => {
    const screen = deal('5', ['A', '2', '5'])
    expect(screen.getByText('STAND')).toBeTruthy()
    expect(screen.queryByText('HIT')).toBeNull()
  })

  test('three-card 11 (2-4-5) vs 6 hits: "double, else hit"', () => {
    expect(deal('6', ['2', '4', '5']).getByText('HIT')).toBeTruthy()
  })
})
