jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})

import { useRouletteStore } from '../../features/roulette/store'
import { emptyStats } from '../../features/profile/stats'
import { useProfileStore } from '../../features/profile/store'

const store = () => useRouletteStore.getState()
const balance = () => useProfileStore.getState().profiles[0].balance
const realRecordHands = useProfileStore.getState().recordHands
const DOUBLE = { wheel: 'double', speed: 'slow' } as const

beforeEach(() => {
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance: 1000, createdAt: 0, startingBalance: 1000, trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
    recordHands: realRecordHands,
  })
  store().setSettings(DOUBLE)
})

afterEach(() => jest.restoreAllMocks())

test('finite balance 20 rejects 25 and accepts two 10 chips', () => {
  useProfileStore.setState(s => ({ profiles: [{ ...s.profiles[0], balance: 20 }] }))
  expect(store().placeChip('red', 25)).toBe(false)
  expect(store().placeChip('red', 10)).toBe(true)
  expect(store().placeChip('red', 10)).toBe(true)
  expect(store().placeChip('red', 10)).toBe(false)
  expect(store().bets).toEqual({ red: 20 })
})

test('rejects unknown bet id and non-betting phase', () => {
  expect(store().placeChip('nope', 5)).toBe(false)
  store().placeChip('red', 10)
  store().spin(() => 0)
  expect(store().placeChip('black', 10)).toBe(false)
})

test('infinite profile has no cap', () => {
  useProfileStore.setState(s => ({ profiles: [{ ...s.profiles[0], bankrollMode: 'infinite', balance: 0 }] }))
  expect(store().placeChip('red', 100000)).toBe(true)
})

test('undo removes the last chip only', () => {
  store().placeChip('red', 10)
  store().placeChip('black', 10)
  store().undo()
  expect(store().bets).toEqual({ red: 10 })
  expect(store().history).toEqual([{ betId: 'red', amount: 10 }])
})

test('undo reducing a stack to zero removes the key', () => {
  store().placeChip('red', 10)
  store().undo()
  expect(store().bets).toEqual({})
})

test('moveStack merges into an existing stack', () => {
  store().placeChip('red', 10)
  store().placeChip('black', 15)
  store().moveStack('red', 'black')
  expect(store().bets).toEqual({ black: 25 })
  expect(store().history.find(h => h.betId === 'red')).toBeUndefined()
})

test('moveStack onto itself or to an unknown bet is a no-op', () => {
  store().placeChip('red', 10)
  store().moveStack('red', 'red')
  store().moveStack('red', 'nope')
  expect(store().bets).toEqual({ red: 10 })
  expect(store().history).toHaveLength(1)
})

test('removeStack and clearBets', () => {
  store().placeChip('red', 10)
  store().placeChip('black', 10)
  store().removeStack('red')
  expect(store().bets).toEqual({ black: 10 })
  expect(store().history.every(h => h.betId !== 'red')).toBe(true)
  store().clearBets()
  expect(store().bets).toEqual({})
  expect(store().history).toEqual([])
})

test('spin below table minimum returns false and stays betting', () => {
  store().placeChip('red', 5)
  expect(store().spinError()).not.toBeNull()
  expect(store().spin()).toBe(false)
  expect(store().phase).toBe('betting')
})

test('spin(() => 0) on double gives pocket 0 and spinning', () => {
  store().placeChip('red', 10)
  expect(store().spin(() => 0)).toBe(true)
  expect(store().result).toBe(0)
  expect(store().phase).toBe('spinning')
})

test('spin twice and finishSpin twice records once', () => {
  const spy = jest.spyOn(useProfileStore.getState(), 'recordHands')
  store().placeChip('red', 10)
  expect(store().spin(() => 0)).toBe(true)
  expect(store().spin(() => 0)).toBe(false)
  store().finishSpin()
  store().finishSpin()
  expect(spy).toHaveBeenCalledTimes(1)
  expect(balance()).toBe(990)
})

test('finishSpin keeps only winners, clears history, sets marker and applies net', () => {
  store().placeChip('red', 10)
  store().placeChip('straight:0', 10)
  store().placeChip('black', 10)
  const ids = Object.keys(store().bets)
  store().spin(() => 0)
  store().finishSpin()
  const s = store()
  expect(s.phase).toBe('result')
  expect(s.marker).toBe(s.result)
  expect(s.history).toEqual([])
  expect(Object.keys(s.bets).sort()).toEqual([...s.lastWinners].sort())
  expect(balance()).toBe(1000 + s.lastNet)
  expect(ids.length).toBeGreaterThan(0)
})

test('winning bet stays and backToTable keeps the marker', () => {
  store().placeChip('red', 10)
  store().placeChip('black', 10)
  // pick a red pocket: 1 is red; find rng index via wheelSequence
  const { wheelSequence } = require('../../features/roulette/engine')
  const idx = wheelSequence('double').indexOf(1)
  store().spin(() => (idx + 0.5) / wheelSequence('double').length)
  expect(store().result).toBe(1)
  store().finishSpin()
  expect(store().bets).toEqual({ red: 10 })
  expect(store().lastNet).toBe(0)
  const marker = store().marker
  store().backToTable()
  expect(store().phase).toBe('betting')
  expect(store().marker).toBe(marker)
  expect(store().bets).toEqual({ red: 10 })
})

test('abandon mid-spin records exactly once', () => {
  const spy = jest.spyOn(useProfileStore.getState(), 'recordHands')
  store().placeChip('red', 10)
  store().spin(() => 0)
  store().abandon()
  expect(spy).toHaveBeenCalledTimes(1)
  expect(store().phase).toBe('betting')
  expect(store().bets).toEqual({})
  expect(store().settings).toEqual(DOUBLE)
  expect(balance()).toBe(990)
})

test('abandon while betting records nothing', () => {
  const spy = jest.spyOn(useProfileStore.getState(), 'recordHands')
  store().placeChip('red', 10)
  store().abandon()
  expect(spy).not.toHaveBeenCalled()
  expect(balance()).toBe(1000)
  expect(store().bets).toEqual({})
})

test('setSettings resets the session', () => {
  store().placeChip('red', 10)
  store().setSettings({ wheel: 'triple', speed: 'fast' })
  expect(store().bets).toEqual({})
  expect(store().settings).toEqual({ wheel: 'triple', speed: 'fast' })
  expect(store().phase).toBe('betting')
})

describe('balance notice', () => {
  const setBalance = (balance: number) =>
    useProfileStore.setState(s => ({ profiles: [{ ...s.profiles[0], balance }] }))

  test('a chip rejected for balance sets the notice; the next successful placement clears it', () => {
    setBalance(20)
    expect(store().placeChip('red', 25)).toBe(false)
    expect(store().notice).toBe('Not enough balance')
    expect(store().reason()).toBe('Not enough balance')
    expect(store().placeChip('red', 10)).toBe(true)
    expect(store().notice).toBeNull()
  })

  test('clear, undo and spin clear the notice', () => {
    setBalance(20)
    store().placeChip('red', 10)
    store().placeChip('red', 25)
    store().undo()
    expect(store().notice).toBeNull()
    store().placeChip('red', 25)
    store().clearBets()
    expect(store().notice).toBeNull()
    store().placeChip('red', 10)
    store().placeChip('red', 25)
    expect(store().spin(() => 0)).toBe(true)
    expect(store().notice).toBeNull()
  })

  test('unknown bet or wrong phase does not set the notice', () => {
    store().placeChip('nope', 5)
    expect(store().notice).toBeNull()
  })

  test('broke profile with no bets sees Not enough balance instead of Place a bet', () => {
    setBalance(0)
    expect(store().reason()).toBe('Not enough balance')
    setBalance(0.5)
    expect(store().reason()).toBe('Not enough balance')
    expect(store().spinError()).toBe('Place a bet')
  })

  test('reason falls back to spinError otherwise', () => {
    expect(store().reason()).toBe('Place a bet')
    store().placeChip('red', 5)
    expect(store().reason()).toBe('Outside bets need $10 each')
    store().placeChip('red', 5)
    expect(store().reason()).toBeNull()
    useProfileStore.setState(s => ({ profiles: [{ ...s.profiles[0], bankrollMode: 'infinite', balance: 0 }] }))
    store().clearBets()
    expect(store().reason()).toBe('Place a bet')
  })
})
