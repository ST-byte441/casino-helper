let mockWindow = { width: 384, height: 832, scale: 3, fontScale: 1 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}))

import React from 'react'
import { render, act } from '@testing-library/react-native'
import * as ScreenOrientation from 'expo-screen-orientation'
import { shouldUnlock, useOrientationLock, useOrientationStore } from '../../lib/orientation'

function Probe() {
  useOrientationLock()
  return null
}

const lastCall = () => {
  const lock = (ScreenOrientation.lockAsync as jest.Mock).mock.invocationCallOrder.at(-1) ?? 0
  const unlock = (ScreenOrientation.unlockAsync as jest.Mock).mock.invocationCallOrder.at(-1) ?? 0
  return unlock > lock ? 'unlock' : 'lock'
}

beforeEach(() => {
  jest.clearAllMocks()
  mockWindow = { width: 384, height: 832, scale: 3, fontScale: 1 }
  useOrientationStore.setState({ rotationRequested: false })
})

test('phones stay portrait unless a screen asks for rotation; large screens always rotate', () => {
  expect(shouldUnlock('compact', false)).toBe(false)
  expect(shouldUnlock('regular', false)).toBe(false)
  expect(shouldUnlock('regular', true)).toBe(true)
  expect(shouldUnlock('large', false)).toBe(true)
  expect(shouldUnlock('large', true)).toBe(true)
})

test('on a phone it locks portrait, then unlocks when the roulette table asks', () => {
  render(<Probe />)
  expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.PORTRAIT_UP)
  expect(ScreenOrientation.unlockAsync).not.toHaveBeenCalled()
  act(() => useOrientationStore.getState().setRotationRequested(true))
  expect(lastCall()).toBe('unlock')
})

test('unfolding while rotation is requested keeps rotation unlocked', () => {
  useOrientationStore.setState({ rotationRequested: true })
  const screen = render(<Probe />)
  mockWindow = { width: 673, height: 884, scale: 2.6, fontScale: 1 }
  screen.rerender(<Probe />)
  expect(lastCall()).toBe('unlock')
  expect(ScreenOrientation.lockAsync).not.toHaveBeenCalled()
})

test('folding back to the cover screen relocks portrait once nothing asks for rotation', () => {
  mockWindow = { width: 673, height: 884, scale: 2.6, fontScale: 1 }
  const screen = render(<Probe />)
  expect(lastCall()).toBe('unlock')
  mockWindow = { width: 320, height: 760, scale: 3, fontScale: 1 }
  screen.rerender(<Probe />)
  expect(lastCall()).toBe('lock')
})

test('a large screen unlocks with nothing requesting rotation, and never locks', () => {
  mockWindow = { width: 673, height: 884, scale: 2.6, fontScale: 1 }
  render(<Probe />)
  expect(ScreenOrientation.unlockAsync).toHaveBeenCalled()
  expect(ScreenOrientation.lockAsync).not.toHaveBeenCalled()
  // Roulette closing on a large screen must not relock portrait.
  act(() => useOrientationStore.getState().setRotationRequested(true))
  act(() => useOrientationStore.getState().setRotationRequested(false))
  expect(ScreenOrientation.lockAsync).not.toHaveBeenCalled()
})
