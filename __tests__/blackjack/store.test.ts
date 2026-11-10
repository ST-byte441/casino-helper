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
import { Card } from '../../lib/types'

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

test('newHand keeps assistEnabled state from previous hand', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => {
    result.current.setTableRules(DEFAULT_TABLE_RULES)
    result.current.toggleAssist()
    result.current.placeBet(25)
    result.current.deal()
    jest.runAllTimers()
    result.current.newHand()
  })
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
    jest.runAllTimers()
  })
  expect(result.current.phase).toBe('result')
})

describe('when the dealer plays out their hand', () => {
  const bustedHand = [
    { suit: '♠', value: 'K' },
    { suit: '♥', value: 'J' },
    { suit: '♦', value: '5' },
  ] as Card[]
  const liveHand = [
    { suit: '♠', value: '10' },
    { suit: '♥', value: '9' },
  ] as Card[]
  // Dealer on 15 must draw under normal rules
  const dealerOn15 = [
    { suit: '♠', value: '9' },
    { suit: '♥', value: '6', faceDown: true },
  ] as Card[]
  const fives = [
    { suit: '♠', value: '5' },
    { suit: '♥', value: '5' },
    { suit: '♦', value: '5' },
  ] as Card[]

  function finishRound(playerHands: Card[][]) {
    const { result } = renderHook(() => useBlackjackStore())
    act(() => {
      useBlackjackStore.setState({
        deck: fives,
        playerHands,
        dealerHand: dealerOn15,
        activeHandIndex: playerHands.length - 1,
        phase: 'playing' as const,
        bet: 15,
        tableRules: DEFAULT_TABLE_RULES,
      })
      result.current.stand()
      jest.runAllTimers()
    })
    return result
  }

  test('dealer only reveals the hole card when the single player hand busted', () => {
    const result = finishRound([bustedHand])
    expect(result.current.dealerHand).toEqual([
      { suit: '♠', value: '9', faceDown: false },
      { suit: '♥', value: '6', faceDown: false },
    ])
    expect(result.current.deck).toHaveLength(3)
    expect(result.current.phase).toBe('result')
    expect(result.current.lastOutcome).toBe('bust')
    expect(result.current.lastDelta).toBe(-15)
  })

  test('dealer does not draw when every split hand busted', () => {
    const result = finishRound([bustedHand, bustedHand])
    expect(result.current.dealerHand).toHaveLength(2)
    expect(result.current.deck).toHaveLength(3)
    expect(result.current.lastDelta).toBe(-30)
  })

  test('dealer still draws when one split hand is live', () => {
    const result = finishRound([bustedHand, liveHand])
    // 15 + 5 = 20 stands; beats the live 19, so both hands lose
    expect(result.current.dealerHand).toHaveLength(3)
    expect(result.current.deck).toHaveLength(2)
    expect(result.current.lastDelta).toBe(-30)
  })

  test('dealer still draws when the player stands without busting', () => {
    const result = finishRound([liveHand])
    expect(result.current.dealerHand).toHaveLength(3)
    expect(result.current.deck).toHaveLength(2)
  })

  const natural = [
    { suit: '♠', value: 'A' },
    { suit: '♥', value: 'K' },
  ] as Card[]

  test('dealer only reveals the hole card against a player natural', () => {
    const result = finishRound([natural])
    expect(result.current.dealerHand).toEqual([
      { suit: '♠', value: '9', faceDown: false },
      { suit: '♥', value: '6', faceDown: false },
    ])
    expect(result.current.deck).toHaveLength(3)
    expect(result.current.lastOutcome).toBe('blackjack')
    expect(result.current.lastDelta).toBe(22) // floor(15 * 1.5)
  })

  test('dealer still draws against a two-card 21 made after a split', () => {
    const result = finishRound([natural, natural])
    expect(result.current.dealerHand).toHaveLength(3)
    expect(result.current.deck).toHaveLength(2)
  })
})

describe('dealer peek for a natural', () => {
  const c = (value: Card['value']): Card => ({ suit: '♠', value })
  const filler = Array.from({ length: 20 }, () => c('2'))
  // Single deck so a short stacked deck doesn't trigger a reshuffle
  const rules = { ...DEFAULT_TABLE_RULES, deckCount: 1, continuousShuffle: false }

  // Deal order: player, dealer upcard, player, dealer hole card
  function dealFrom(top: Card[]) {
    const { result } = renderHook(() => useBlackjackStore())
    act(() => {
      useBlackjackStore.setState({ deck: [...top, ...filler], tableRules: rules, bet: 15 })
      result.current.deal()
      jest.runAllTimers()
    })
    return result
  }

  test('dealer natural ends the hand as a loss before the player can act', () => {
    const result = dealFrom([c('10'), c('A'), c('9'), c('K')])
    expect(result.current.phase).toBe('result')
    expect(result.current.lastOutcome).toBe('lose')
    expect(result.current.lastDelta).toBe(-15)
    expect(result.current.dealerHand.some(card => card.faceDown)).toBe(false)
    expect(result.current.dealerHand).toHaveLength(2)
  })

  test('dealer natural with a ten-value upcard is also caught', () => {
    const result = dealFrom([c('10'), c('K'), c('9'), c('A')])
    expect(result.current.phase).toBe('result')
    expect(result.current.lastOutcome).toBe('lose')
  })

  test('dealer natural against a player natural is a push', () => {
    const result = dealFrom([c('A'), c('A'), c('K'), c('K')])
    expect(result.current.phase).toBe('result')
    expect(result.current.lastOutcome).toBe('push')
    expect(result.current.lastDelta).toBe(0)
  })

  test('play continues when the dealer has no natural', () => {
    const result = dealFrom([c('10'), c('A'), c('9'), c('9')])
    expect(result.current.phase).toBe('playing')
    expect(result.current.dealerHand[1].faceDown).toBe(true)
  })
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
