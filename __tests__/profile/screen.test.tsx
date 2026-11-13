jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
const mockParams: { id: string } = { id: 'p1' }
const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, back: mockBack }),
  router: { push: mockPush, back: mockBack },
}))
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }))
jest.mock('expo-file-system', () => ({ Directory: class {}, File: class {}, Paths: {} }))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ProfileDetail from '../../app/profile/[id]'
import { ProfileList } from '../../features/profile/components/ProfileList'
import { useProfileStore } from '../../features/profile/store'
import { emptyStats } from '../../features/profile/stats'
import { Profile } from '../../features/profile/types'

const base = (over: Partial<Profile> = {}): Profile => ({
  id: 'p1', name: 'Alex', bankrollMode: 'finite', balance: 1340,
  createdAt: new Date(2026, 10, 2).getTime(), startingBalance: 1000,
  trackingSince: new Date(2026, 10, 2).getTime(),
  refills: [{ amount: 500, at: 1 }, { amount: 500, at: 2 }, { amount: 500, at: 3 }],
  stats: emptyStats(), ...over,
})

function setup(p: Profile, active: string | null = null) {
  useProfileStore.setState({ profiles: [p], activeProfileId: active })
}

beforeEach(() => { mockPush.mockClear(); mockBack.mockClear(); mockParams.id = 'p1' })

test('finite profile shows balance and bankroll', () => {
  const stats = emptyStats(); stats.blackjack.net = -1160
  setup(base({ stats }))
  const { getByText, getAllByText } = render(<ProfileDetail />)
  getByText('Alex'); getByText('Created Nov 2, 2026'); getByText('$1,340')
  getByText('+ Add Money'); getByText('Started with'); getByText('Refills')
  getByText('3 · $1,500'); getByText('Net all games'); expect(getAllByText('−$1,160').length).toBe(2)
})

test('add money updates balance and records refill', () => {
  setup(base())
  const { getByText, getByPlaceholderText, getAllByText } = render(<ProfileDetail />)
  fireEvent.press(getByText('+ Add Money'))
  fireEvent.changeText(getByPlaceholderText('Amount'), '250')
  fireEvent.press(getByText('Add'))
  const p = useProfileStore.getState().profiles[0]
  expect(p.balance).toBe(1590)
  expect(p.refills).toHaveLength(4)
  expect(getAllByText('$1,590').length).toBeGreaterThan(0)
})

test('infinite profile hides add money and bankroll', () => {
  setup(base({ bankrollMode: 'infinite' }))
  const { queryByText, getByText } = render(<ProfileDetail />)
  getByText('∞'); getByText('Blackjack')
  expect(queryByText('+ Add Money')).toBeNull()
  expect(queryByText('Bankroll')).toBeNull()
})

test('set active / active label', () => {
  setup(base())
  const { getByText, queryByText, rerender } = render(<ProfileDetail />)
  expect(queryByText('Active')).toBeNull()
  fireEvent.press(getByText('Set Active'))
  expect(useProfileStore.getState().activeProfileId).toBe('p1')
  rerender(<ProfileDetail />)
  getByText('Active')
  expect(queryByText('Set Active')).toBeNull()
})

test('stats tabs', () => {
  const stats = emptyStats()
  stats.blackjack = { wins: 3, losses: 1, pushes: 2, biggestWin: 150, net: 220 }
  stats.baccarat = { wins: 0, losses: 0, pushes: 2, biggestWin: 0, net: -180 }
  stats.craps = { rolls: 212, pointsMade: 9, sevenOuts: 14, biggestWin: 300, net: -1200 }
  setup(base({ stats }))
  const { getByText, queryByText } = render(<ProfileDetail />)
  getByText('Wins'); getByText('Losses'); getByText('Pushes'); getByText('75.0%')
  getByText('Biggest win'); getByText('+$220')
  fireEvent.press(getByText('Baccarat'))
  getByText('Ties'); getByText('—'); getByText('−$180')
  fireEvent.press(getByText('Craps'))
  getByText('Points made'); getByText('Seven-outs'); getByText('Rolls'); getByText('Lifetime'); getByText('−$1,200')
  expect(queryByText('Wins')).toBeNull()
})

test('unknown id shows not found with back', () => {
  setup(base()); mockParams.id = 'nope'
  const { getByText } = render(<ProfileDetail />)
  getByText('Profile not found')
  fireEvent.press(getByText('Back'))
  expect(mockBack).toHaveBeenCalled()
})

test('list card opens detail and shows negative balance', () => {
  const onOpen = jest.fn()
  const { getByText } = render(
    <ProfileList profiles={[base({ balance: -50 })]} activeProfileId={null} onOpen={onOpen} onDelete={jest.fn()} />
  )
  getByText('−$50')
  fireEvent.press(getByText('Alex'))
  expect(onOpen).toHaveBeenCalledWith('p1')
})

test('profile tab screen pushes route', () => {
  setup(base())
  const ProfileTab = require('../../app/(tabs)/profile').default
  const { getByText } = render(<ProfileTab />)
  fireEvent.press(getByText('Alex'))
  expect(mockPush).toHaveBeenCalledWith('/profile/p1')
  expect(useProfileStore.getState().activeProfileId).toBeNull()
})
