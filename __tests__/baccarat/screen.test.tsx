jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }))
import 'react-native-gesture-handler/jestSetup'

import React from 'react'
import { render } from '@testing-library/react-native'
import BaccaratScreen from '../../app/baccarat'
import { useBaccaratStore } from '../../features/baccarat/store'
import { Card } from '../../lib/types'

const c = (value: Card['value']): Card => ({ value, suit: '♠' })
const STACKED: Card[] = [c('9'), c('3'), c('K'), c('K'), ...Array.from({ length: 10 }, () => c('K'))]

function dealWith(mode: 'squeeze' | 'flip') {
  useBaccaratStore.getState().newHand()
  useBaccaratStore.setState({ deck: [...STACKED] })
  useBaccaratStore.getState().placeBet('player', 10)
  useBaccaratStore.getState().deal(mode)
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

test('table does not bounce while squeezing', () => {
  dealWith('squeeze')
  const { getByTestId } = render(<BaccaratScreen />)
  expect(getByTestId('baccarat-table').props.bounces).toBe(false)
})

test('table still bounces in flip mode', () => {
  dealWith('flip')
  const { getByTestId } = render(<BaccaratScreen />)
  expect(getByTestId('baccarat-table').props.bounces).toBe(true)
})
