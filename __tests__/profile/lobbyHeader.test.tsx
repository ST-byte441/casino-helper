jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
const mockNavigate = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), navigate: mockNavigate }) }))

import React from 'react'
import { Image } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import LobbyScreen from '../../app/(tabs)/index'
import { useProfileStore } from '../../features/profile/store'
import { emptyStats } from '../../features/profile/stats'
import { DEFAULT_PICTURE } from '../../features/profile/pictures'

function setProfile(picture?: any) {
  useProfileStore.setState({
    profiles: [{
      id: 'p1', name: 'Sam', bankrollMode: 'finite', balance: 500, createdAt: 0,
      startingBalance: 500, trackingSince: 0, refills: [], stats: emptyStats(), picture,
    }],
    activeProfileId: 'p1',
  })
}

beforeEach(() => mockNavigate.mockClear())

test('lobby header shows the active profile picture next to the name', () => {
  setProfile({ kind: 'upload', uri: 'file:///me.jpg' })
  const { getByText, UNSAFE_getByType } = render(<LobbyScreen />)
  getByText('Sam')
  expect(UNSAFE_getByType(Image).props.source).toEqual({ uri: 'file:///me.jpg' })
})

test('lobby header falls back to the default picture when the profile has none', () => {
  setProfile(undefined)
  const { UNSAFE_getByType } = render(<LobbyScreen />)
  expect(UNSAFE_getByType(Image).props.source).toBe(DEFAULT_PICTURE)
})

test('tapping the picture and name opens the Profile tab', () => {
  setProfile(undefined)
  const { getByTestId } = render(<LobbyScreen />)
  fireEvent.press(getByTestId('lobby-profile-button'))
  expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/profile')
})

test('with no active profile the header still opens the Profile tab', () => {
  useProfileStore.setState({ profiles: [], activeProfileId: null as any })
  const { getByTestId, getByText } = render(<LobbyScreen />)
  getByText('No profile')
  fireEvent.press(getByTestId('lobby-profile-button'))
  expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/profile')
})
