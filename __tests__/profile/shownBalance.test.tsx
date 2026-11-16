jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }))
import 'react-native-gesture-handler/jestSetup'

import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { render as rtlRender, fireEvent, act } from '@testing-library/react-native'
import BlackjackScreen from '../../app/blackjack'
import BaccaratScreen from '../../app/baccarat'
import RouletteScreen from '../../app/roulette'
import { useProfileStore } from '../../features/profile/store'
import { useBlackjackStore, stakeOnTable as blackjackStake } from '../../features/blackjack/store'
import { useBaccaratStore, stakeOnTable as baccaratStake } from '../../features/baccarat/store'
import { useRouletteStore } from '../../features/roulette/store'
import { emptyStats } from '../../features/profile/stats'
import { shownBalanceFor } from '../../lib/bankroll'

const render: typeof rtlRender = (ui, options) => rtlRender(ui, { wrapper: GestureHandlerRootView, ...options })

function setProfile(mode: 'finite' | 'infinite', balance: number) {
  useProfileStore.setState({
    profiles: [{
      id: 'p1', name: 'T', bankrollMode: mode, balance, createdAt: 0,
      startingBalance: 1000, trackingSince: 0, refills: [], stats: emptyStats(),
    }],
    activeProfileId: 'p1',
  })
}

beforeEach(() => { jest.useFakeTimers(); setProfile('finite', 1000) })
afterEach(() => jest.useRealTimers())

describe('shownBalanceFor', () => {
  test('finite: the balance less the stake on the table; infinite or no profile: null', () => {
    expect(shownBalanceFor({ bankrollMode: 'finite', balance: 1000 }, 35)).toBe(965)
    expect(shownBalanceFor({ bankrollMode: 'infinite', balance: 1000 }, 35)).toBeNull()
    expect(shownBalanceFor(undefined, 35)).toBeNull()
  })
})

describe('stake on the table', () => {
  test('blackjack: the bet while betting, every hand stake while in play, nothing once settled', () => {
    expect(blackjackStake({ phase: 'betting', bet: 25, handBets: [] })).toBe(25)
    expect(blackjackStake({ phase: 'dealing', bet: 25, handBets: [25] })).toBe(25)
    expect(blackjackStake({ phase: 'playing', bet: 25, handBets: [50, 25] })).toBe(75)
    expect(blackjackStake({ phase: 'result', bet: 25, handBets: [50, 25] })).toBe(0)
  })

  test('baccarat: every bet until the hand settles', () => {
    expect(baccaratStake({ bets: { player: 10, tie: 5 }, settled: false })).toBe(15)
    expect(baccaratStake({ bets: { player: 10, tie: 5 }, settled: true })).toBe(0)
  })
})

describe('game screens show the balance less the stake on the table', () => {
  test('blackjack', async () => {
    const { getByText } = render(<BlackjackScreen />)
    fireEvent.press(getByText('Play'))
    await act(async () => { useBlackjackStore.getState().placeBet(25) })
    expect(getByText('Balance: $975')).toBeTruthy()
    await act(async () => { useBlackjackStore.getState().clearBet() })
    expect(getByText('Balance: $1,000')).toBeTruthy()
    expect(useProfileStore.getState().profiles[0].balance).toBe(1000)
  })

  test('baccarat', async () => {
    useBaccaratStore.getState().newHand()
    const { getByText } = render(<BaccaratScreen />)
    await act(async () => { useBaccaratStore.getState().placeBet('player', 10) })
    expect(getByText('Balance: $990')).toBeTruthy()
    expect(useProfileStore.getState().profiles[0].balance).toBe(1000)
  })

  test('roulette', async () => {
    const { getByText } = render(<RouletteScreen />)
    fireEvent.press(getByText('Play'))
    await act(async () => { useRouletteStore.getState().placeChip('straight:17', 5) })
    expect(getByText('$995')).toBeTruthy()
    await act(async () => { useRouletteStore.getState().clearBets() })
    expect(getByText('$1,000')).toBeTruthy()
  })
})
