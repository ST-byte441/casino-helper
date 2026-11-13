jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return {
    ...actual,
    persist: (config: any) => config,
    createJSONStorage: () => undefined,
  }
})

import { useBaccaratStore } from '../../features/baccarat/store'
import { emptyStats } from '../../features/profile/stats'
import { useProfileStore } from '../../features/profile/store'
import { usePreferencesStore } from '../../features/preferences/store'
import { Card } from '../../lib/types'

const c = (value: Card['value']): Card => ({ value, suit: '♠' })

// Deal order P1, B1, P2, B2 → Player 9 + K = natural 9, Banker 3 + K = 3. Player wins, no draws.
const STACKED: Card[] = [c('9'), c('3'), c('K'), c('K'), ...Array.from({ length: 10 }, () => c('K'))]

const balance = () => useProfileStore.getState().profiles[0].balance
const store = () => useBaccaratStore.getState()

function revealAll() {
  const n = store().revealOrder.length
  for (let i = 0; i < n; i++) store().revealNext()
}

beforeEach(() => {
  jest.useFakeTimers()
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance: 1000, createdAt: 0, startingBalance: 1000, trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
  })
  store().newHand()
  useBaccaratStore.setState({ deck: [...STACKED] })
  store().placeBet('player', 100)
})

afterEach(() => jest.useRealTimers())

test('deal does not change balance and enters revealing', () => {
  store().deal('squeeze')
  expect(balance()).toBe(1000)
  expect(store().phase).toBe('revealing')
  expect(store().revealedCount).toBe(0)
  expect(store().revealOrder).toHaveLength(4)
})

test('revealNext through all cards settles once', () => {
  store().deal('squeeze')
  revealAll()
  expect(store().phase).toBe('result')
  expect(balance()).toBe(1100)
})

test('balance unchanged until the last card is revealed', () => {
  store().deal('squeeze')
  store().revealNext()
  store().revealNext()
  store().revealNext()
  expect(store().phase).toBe('revealing')
  expect(balance()).toBe(1000)
})

test('extra revealNext after result does not double-apply', () => {
  store().deal('squeeze')
  revealAll()
  store().revealNext()
  store().revealNext()
  store().revealNext()
  expect(balance()).toBe(1100)
  expect(store().revealedCount).toBe(4)
})

test('abandonHand mid-reveal applies delta and resets', () => {
  store().deal('squeeze')
  store().revealNext()
  store().revealNext()
  store().abandonHand()
  expect(balance()).toBe(1100)
  expect(store().phase).toBe('betting')
  expect(store().bets).toEqual({})
})

test('abandonHand from result does not re-apply', () => {
  store().deal('squeeze')
  revealAll()
  store().abandonHand()
  expect(balance()).toBe(1100)
  expect(store().phase).toBe('betting')
})

test('abandonHand twice mid-reveal applies once', () => {
  store().deal('squeeze')
  store().abandonHand()
  store().abandonHand()
  expect(balance()).toBe(1100)
})

test('handRevealMode is snapshotted at deal', () => {
  store().deal('flip')
  usePreferencesStore.getState().setBaccaratRevealMode('squeeze')
  expect(store().handRevealMode).toBe('flip')
})

test('result phase stays until newHand', () => {
  store().deal('squeeze')
  revealAll()
  jest.advanceTimersByTime(10000)
  expect(store().phase).toBe('result')
  store().newHand()
  expect(store().phase).toBe('betting')
})

const bacStats = () => useProfileStore.getState().profiles[0].stats.baccarat

test('full reveal records exactly one hand matching lastNetDelta', () => {
  store().deal('squeeze')
  revealAll()
  const net = store().lastNetDelta
  store().revealNext()
  store().abandonHand()
  const s = bacStats()
  expect(s.wins + s.losses + s.pushes).toBe(1)
  expect(s.wins).toBe(1)
  expect(s.net).toBe(net)
})

test('abandonHand mid-reveal records once, even when called twice', () => {
  store().deal('squeeze')
  store().revealNext()
  const net = store().lastNetDelta
  store().abandonHand()
  store().abandonHand()
  const s = bacStats()
  expect(s.wins + s.losses + s.pushes).toBe(1)
  expect(s.net).toBe(net)
})

test('zero-stake hand records nothing', () => {
  store().clearBets()
  store().deal('squeeze')
  revealAll()
  store().abandonHand()
  const s = bacStats()
  expect(s.wins + s.losses + s.pushes).toBe(0)
  expect(s.net).toBe(0)
})

describe('table minimum', () => {
  test('deal is refused without at least $15 on Player or Banker', () => {
    store().newHand()
    useBaccaratStore.setState({ deck: [...STACKED] })
    store().placeBet('player', 10)
    store().placeBet('tie', 5)
    store().deal('squeeze')
    expect(store().phase).toBe('betting')
    store().placeBet('player', 5) // now $15 on Player
    store().deal('squeeze')
    expect(store().phase).toBe('revealing')
  })

  test('side bets alone cannot be dealt', () => {
    store().newHand()
    store().placeBet('tie', 50)
    store().placeBet('player-pair', 20)
    store().deal('squeeze')
    expect(store().phase).toBe('betting')
  })
})
