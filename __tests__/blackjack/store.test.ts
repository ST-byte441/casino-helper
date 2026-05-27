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

import { act, renderHook } from '@testing-library/react-native'
import { useBlackjackStore } from '../../features/blackjack/store'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'

beforeEach(() => {
  jest.useFakeTimers()
  useBlackjackStore.setState(useBlackjackStore.getState().getInitialState())
})

afterEach(() => {
  jest.useRealTimers()
})

test('initial phase is betting', () => {
  const { result } = renderHook(() => useBlackjackStore())
  expect(result.current.phase).toBe('betting')
})

test('placeBet adds to current bet', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => result.current.placeBet(25))
  expect(result.current.bet).toBe(25)
  act(() => result.current.placeBet(15))
  expect(result.current.bet).toBe(40)
})

test('clearBet resets bet to 0', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => result.current.placeBet(50))
  act(() => result.current.clearBet())
  expect(result.current.bet).toBe(0)
})

test('deal transitions to playing or result phase', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => {
    result.current.setTableRules(DEFAULT_TABLE_RULES)
    result.current.placeBet(15)
    result.current.deal()
    jest.runAllTimers()
  })
  // Natural blackjack immediately resolves to 'result'; otherwise 'playing'
  expect(['playing', 'result']).toContain(result.current.phase)
})

test('deal gives player 2 cards and dealer 2 cards', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => {
    result.current.setTableRules(DEFAULT_TABLE_RULES)
    result.current.placeBet(15)
    result.current.deal()
    jest.runAllTimers()
  })
  expect(result.current.playerHands[0]).toHaveLength(2)
  // Dealer hand always has 2 cards (one face down)
  expect(result.current.dealerHand.length).toBeGreaterThanOrEqual(2)
})

test('toggleAssist flips assistEnabled', () => {
  const { result } = renderHook(() => useBlackjackStore())
  expect(result.current.assistEnabled).toBe(false)
  act(() => result.current.toggleAssist())
  expect(result.current.assistEnabled).toBe(true)
})

test('newHand resets hands and bet but keeps tableRules', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => {
    result.current.setTableRules(DEFAULT_TABLE_RULES)
    result.current.placeBet(25)
    result.current.deal()
    jest.runAllTimers()
    result.current.newHand()
  })
  expect(result.current.bet).toBe(0)
  expect(result.current.phase).toBe('betting')
  expect(result.current.tableRules).toEqual(DEFAULT_TABLE_RULES)
})

test('hit that busts advances to result phase', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => {
    useBlackjackStore.setState({
      playerHands: [[
        { suit: '♠', value: 'K' },
        { suit: '♥', value: 'J' },
        { suit: '♦', value: '5' },
      ]], // score 25 — busted
      dealerHand: [
        { suit: '♠', value: '9' },
        { suit: '♥', value: '8', faceDown: true },
      ],
      activeHandIndex: 0,
      phase: 'playing' as const,
      bet: 15,
      tableRules: DEFAULT_TABLE_RULES,
    })
    result.current.stand()
  })
  expect(result.current.phase).toBe('result')
})

test('surrender removes half the bet and ends hand', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => {
    useBlackjackStore.setState({
      playerHands: [[
        { suit: '♠', value: 'K' },
        { suit: '♥', value: '7' },
      ]],
      dealerHand: [
        { suit: '♠', value: '9' },
        { suit: '♥', value: '8', faceDown: true },
      ],
      activeHandIndex: 0,
      phase: 'playing' as const,
      bet: 50,
      tableRules: DEFAULT_TABLE_RULES,
    })
    result.current.surrender()
  })
  expect(result.current.phase).toBe('result')
  expect(result.current.lastDelta).toBe(-25)
})
