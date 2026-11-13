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
import { useProfileStore } from '../../features/profile/store'
import { emptyStats } from '../../features/profile/stats'
import { resolveHand } from '../../features/blackjack/engine'

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
      handBets: [15],
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
        handBets: playerHands.map(() => 15),
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
      handBets: [50],
      tableRules: DEFAULT_TABLE_RULES,
    })
    result.current.surrender()
  })
  expect(result.current.phase).toBe('result')
  expect(result.current.lastDelta).toBe(-25)
})

describe('per-hand stakes and stat recording', () => {
  const k = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })
  function setProfile(mode: 'finite' | 'infinite', balance: number) {
    useProfileStore.setState({
      profiles: [{
        id: 'p1', name: 'T', bankrollMode: mode, balance, createdAt: 0,
        startingBalance: balance, trackingSince: 0, refills: [], stats: emptyStats(),
      }],
      activeProfileId: 'p1',
    })
  }
  const stats = () => useProfileStore.getState().profiles[0].stats.blackjack
  const playing = (extra: object) => useBlackjackStore.setState({
    phase: 'playing', activeHandIndex: 0, tableRules: DEFAULT_TABLE_RULES,
    dealerHand: [k('10'), { ...k('7'), faceDown: true }], ...extra,
  })

  test('double on one split hand only doubles that hand and settles each hand on its own stake', () => {
    setProfile('finite', 1000)
    const { result } = renderHook(() => useBlackjackStore())
    act(() => {
      playing({
        playerHands: [[k('8'), k('8', '♥')]], handBets: [20], bet: 20,
        deck: [k('3'), k('2'), k('10'), k('5'), k('4'), k('9'), k('6')],
      })
      result.current.split()
      jest.runAllTimers()
    })
    expect(result.current.handBets).toEqual([20, 20])
    act(() => {
      result.current.doubleDown()
    })
    expect(result.current.handBets).toEqual([40, 20])
    act(() => {
      result.current.stand()
      jest.runAllTimers()
    })
    const s = result.current
    expect(s.phase).toBe('result')
    const st = stats()
    expect(st.wins + st.losses + st.pushes).toBe(2)
    const expected = s.playerHands.reduce(
      (sum, h, i) => sum + resolveHand(h, s.dealerHand, s.handBets[i], DEFAULT_TABLE_RULES).delta, 0)
    expect(st.net).toBe(expected)
    expect(s.lastDelta).toBe(expected)
  })

  test('canAffordExtra false when balance cannot cover another stake; double/split no-op', () => {
    setProfile('finite', 100)
    const { result } = renderHook(() => useBlackjackStore())
    act(() => {
      playing({ playerHands: [[k('8'), k('8', '♥')]], handBets: [60], bet: 60, deck: [k('2'), k('3'), k('4')] })
    })
    expect(result.current.canAffordExtra()).toBe(false)
    act(() => { result.current.doubleDown() })
    expect(result.current.playerHands).toHaveLength(1)
    expect(result.current.playerHands[0]).toHaveLength(2)
    expect(result.current.handBets).toEqual([60])
    act(() => { result.current.split() })
    expect(result.current.playerHands).toHaveLength(1)
    expect(result.current.handBets).toEqual([60])
  })

  test('canAffordExtra true when covered, and for infinite profiles', () => {
    setProfile('finite', 120)
    const { result } = renderHook(() => useBlackjackStore())
    act(() => { playing({ playerHands: [[k('8'), k('8', '♥')]], handBets: [60], bet: 60 }) })
    expect(result.current.canAffordExtra()).toBe(true)
    setProfile('infinite', 0)
    expect(result.current.canAffordExtra()).toBe(true)
  })

  test('surrender records one loss of half the stake', () => {
    setProfile('finite', 500)
    const { result } = renderHook(() => useBlackjackStore())
    act(() => {
      playing({ playerHands: [[k('K'), k('7')]], handBets: [50], bet: 50 })
      result.current.surrender()
    })
    expect(stats().losses).toBe(1)
    expect(stats().net).toBe(-25)
  })

  test('dealer natural on peek records one loss', () => {
    setProfile('finite', 500)
    const { result } = renderHook(() => useBlackjackStore())
    act(() => {
      useBlackjackStore.setState({
        deck: [k('10'), k('A'), k('9'), k('K'), ...Array(20).fill(k('2'))],
        tableRules: { ...DEFAULT_TABLE_RULES, deckCount: 1, continuousShuffle: false }, bet: 15,
      })
      result.current.deal()
      jest.runAllTimers()
    })
    expect(stats().losses).toBe(1)
    expect(stats().net).toBe(-15)
  })
  test('re-splitting the second of two hands copies that hand\'s stake', () => {
    setProfile('infinite', 0)
    const { result } = renderHook(() => useBlackjackStore())
    act(() => {
      playing({
        playerHands: [[k('K'), k('9')], [k('8'), k('8', '♥')]],
        handBets: [10, 20], bet: 10, activeHandIndex: 1,
        deck: [k('3'), k('2'), k('5'), k('6')],
      })
      result.current.split()
      jest.runAllTimers()
    })
    expect(result.current.playerHands).toHaveLength(3)
    expect(result.current.handBets).toEqual([10, 20, 20])
  })

  test('surrender is not allowed once the hand has been split', () => {
    setProfile('finite', 500)
    const { result } = renderHook(() => useBlackjackStore())
    act(() => {
      playing({ playerHands: [[k('K'), k('7')], [k('K', '♥'), k('6')]], handBets: [10, 10], bet: 10 })
    })
    const before = useBlackjackStore.getState()
    act(() => { result.current.surrender() })
    expect(result.current.phase).toBe('playing')
    expect(result.current.playerHands).toBe(before.playerHands)
    expect(result.current.lastDelta).toBe(before.lastDelta)
    expect(stats().losses).toBe(0)
    expect(stats().net).toBe(0)
  })
})

describe('abandonHand (leaving the table)', () => {
  const k = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })
  function setProfile(balance: number) {
    useProfileStore.setState({
      profiles: [{
        id: 'p1', name: 'T', bankrollMode: 'finite', balance, createdAt: 0,
        startingBalance: balance, trackingSince: 0, refills: [], stats: emptyStats(),
      }],
      activeProfileId: 'p1',
    })
  }
  const profile = () => useProfileStore.getState().profiles[0]
  const recorded = () => {
    const b = profile().stats.blackjack
    return b.wins + b.losses + b.pushes
  }
  const rules = { ...DEFAULT_TABLE_RULES, deckCount: 1, continuousShuffle: false }
  const filler = Array.from({ length: 20 }, () => k('2'))

  test('in playing, every hand stands and settles once on its own stake', () => {
    setProfile(1000)
    act(() => {
      useBlackjackStore.setState({
        phase: 'playing', activeHandIndex: 0, tableRules: rules, bet: 20,
        // dealer 17 stands; hand 1 (19) wins 20, hand 2 (16) loses 40
        dealerHand: [k('10'), { ...k('7'), faceDown: true }],
        playerHands: [[k('10'), k('9')], [k('10', '♥'), k('6')]],
        handBets: [20, 40],
        deck: [...filler],
      })
      useBlackjackStore.getState().abandonHand()
    })
    expect(recorded()).toBe(2)
    expect(profile().stats.blackjack.wins).toBe(1)
    expect(profile().stats.blackjack.losses).toBe(1)
    expect(profile().stats.blackjack.net).toBe(-20)
    expect(profile().balance).toBe(980)
    act(() => { jest.runAllTimers() })
    expect(recorded()).toBe(2)
    expect(profile().balance).toBe(980)
  })

  test('during the dealer animation it settles once and later timers record nothing', () => {
    setProfile(1000)
    act(() => {
      useBlackjackStore.setState({
        phase: 'playing', activeHandIndex: 0, tableRules: rules, bet: 20,
        dealerHand: [k('10'), { ...k('6'), faceDown: true }],
        playerHands: [[k('10'), k('9')]],
        handBets: [20],
        deck: [k('5'), ...filler], // dealer draws to 21
      })
      useBlackjackStore.getState().stand()
    })
    expect(useBlackjackStore.getState().phase).toBe('dealing')
    act(() => { useBlackjackStore.getState().abandonHand() })
    expect(recorded()).toBe(1)
    expect(profile().balance).toBe(980)
    act(() => { jest.runAllTimers() })
    expect(recorded()).toBe(1)
    expect(profile().balance).toBe(980)
  })

  test('after the dealer animation already settled it records nothing more', () => {
    setProfile(1000)
    act(() => {
      useBlackjackStore.setState({
        phase: 'playing', activeHandIndex: 0, tableRules: rules, bet: 20,
        dealerHand: [k('10'), { ...k('7'), faceDown: true }],
        playerHands: [[k('10'), k('9')]],
        handBets: [20],
        deck: [...filler],
      })
      useBlackjackStore.getState().stand()
      jest.runAllTimers()
    })
    expect(recorded()).toBe(1)
    act(() => { useBlackjackStore.getState().abandonHand() })
    expect(recorded()).toBe(1)
    expect(profile().balance).toBe(1020)
  })

  test('during the initial deal it completes the deal and auto-stands', () => {
    setProfile(1000)
    act(() => {
      // player 10+9 = 19; dealer 9+7 = 16 draws a 2 → 18; player wins 15
      useBlackjackStore.setState({ deck: [k('10'), k('9'), k('9', '♥'), k('7'), ...filler], tableRules: rules, bet: 15 })
      useBlackjackStore.getState().deal()
      useBlackjackStore.getState().abandonHand()
    })
    expect(recorded()).toBe(1)
    expect(profile().balance).toBe(1015)
    act(() => { jest.runAllTimers() })
    expect(recorded()).toBe(1)
  })

  test('during the initial deal with a dealer natural it records that loss once', () => {
    setProfile(1000)
    act(() => {
      useBlackjackStore.setState({ deck: [k('10'), k('A'), k('9'), k('K'), ...filler], tableRules: rules, bet: 15 })
      useBlackjackStore.getState().deal()
      useBlackjackStore.getState().abandonHand()
      jest.runAllTimers()
    })
    expect(recorded()).toBe(1)
    expect(profile().balance).toBe(985)
  })

  test('during the split animation it completes the split and settles both hands', () => {
    setProfile(1000)
    act(() => {
      useBlackjackStore.setState({
        phase: 'playing', activeHandIndex: 0, tableRules: rules, bet: 10,
        dealerHand: [k('10'), { ...k('7'), faceDown: true }],
        playerHands: [[k('8'), k('8', '♥')]],
        handBets: [10],
        // 8+K = 18 wins, 8+9 = 17 pushes
        deck: [k('K'), k('9'), ...filler],
      })
      useBlackjackStore.getState().split()
      useBlackjackStore.getState().abandonHand()
    })
    expect(recorded()).toBe(2)
    expect(profile().stats.blackjack.wins).toBe(1)
    expect(profile().stats.blackjack.pushes).toBe(1)
    expect(profile().balance).toBe(1010)
    act(() => { jest.runAllTimers() })
    expect(recorded()).toBe(2)
  })

  test('in betting or result it records nothing', () => {
    setProfile(1000)
    act(() => {
      useBlackjackStore.setState({ phase: 'betting', bet: 25, tableRules: rules })
      useBlackjackStore.getState().abandonHand()
    })
    expect(recorded()).toBe(0)
    act(() => {
      useBlackjackStore.setState({
        phase: 'playing', activeHandIndex: 0, tableRules: rules, bet: 50,
        dealerHand: [k('10'), { ...k('7'), faceDown: true }],
        playerHands: [[k('K'), k('7')]], handBets: [50],
      })
      useBlackjackStore.getState().surrender()
    })
    expect(useBlackjackStore.getState().phase).toBe('result')
    expect(recorded()).toBe(1)
    act(() => { useBlackjackStore.getState().abandonHand() })
    expect(recorded()).toBe(1)
    expect(profile().balance).toBe(975)
  })

  test('setTableRules cancels pending deal steps', () => {
    setProfile(1000)
    act(() => {
      useBlackjackStore.setState({ deck: [k('10'), k('A'), k('9'), k('K'), ...filler], tableRules: rules, bet: 15 })
      useBlackjackStore.getState().deal()
      useBlackjackStore.getState().setTableRules(rules)
      jest.runAllTimers()
    })
    expect(useBlackjackStore.getState().phase).toBe('betting')
    expect(useBlackjackStore.getState().playerHands).toEqual([[]])
    expect(useBlackjackStore.getState().dealerHand).toEqual([])
    expect(recorded()).toBe(0)
  })
})
