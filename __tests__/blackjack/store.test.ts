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
import { useBlackjackStore, carriedBet } from '../../features/blackjack/store'
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

test('newHand resets hands, keeps the bet and tableRules', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => {
    result.current.setTableRules(DEFAULT_TABLE_RULES)
    result.current.placeBet(25)
    result.current.deal()
    jest.runAllTimers()
    result.current.newHand()
  })
  expect(result.current.bet).toBe(25)
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

describe('Assist suggests only moves you can make, with the right fallback', () => {
  const k = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })
  function setBalance(balance: number) {
    useProfileStore.setState({
      profiles: [{
        id: 'p1', name: 'T', bankrollMode: 'finite', balance, createdAt: 0,
        startingBalance: balance, trackingSince: 0, refills: [], stats: emptyStats(),
      }],
      activeProfileId: 'p1',
    })
  }
  const playing = (up: Card['value'], extra: object) => useBlackjackStore.setState({
    phase: 'playing', activeHandIndex: 0, tableRules: DEFAULT_TABLE_RULES, assistEnabled: true,
    dealerHand: [k(up), { ...k('7'), faceDown: true }], ...extra,
  })
  const s = () => useBlackjackStore.getState()
  /** Recompute the suggestion as the store does when Assist is switched on. */
  const reAssist = () => act(() => { s().toggleAssist(); s().toggleAssist() })

  beforeEach(() => setBalance(1000))

  test('three-card soft 18 vs 5 (A-2 then a 5): Stand, not Hit', () => {
    act(() => { playing('5', { playerHands: [[k('A'), k('2')]], handBets: [20], bet: 20, deck: [k('5'), k('9')] }) })
    act(() => { s().hit() })
    expect(s().playerHands[0].map(c => c.value)).toEqual(['A', '2', '5'])
    expect(s().suggestedAction).toBe('stand')
  })

  // 7s split vs 5, then an ace: 7-A is soft 18 (split aces would just stand, so they can't show this).
  test('after a split at a no-DAS table: 7-A vs 5 stands, and Double is off on the first hand too', () => {
    act(() => {
      playing('5', {
        tableRules: { ...DEFAULT_TABLE_RULES, doubleAfterSplit: false },
        playerHands: [[k('7'), k('7', '♥')]], handBets: [20], bet: 20, deck: [k('A'), k('9'), k('2')],
      })
      s().split()
      jest.runAllTimers()
    })
    expect(s().playerHands[0].map(c => c.value)).toEqual(['7', 'A'])
    expect(s().suggestedAction).toBe('stand')
    expect(s().canDoubleNow()).toBe(false)
    act(() => { s().doubleDown() })
    expect(s().handBets).toEqual([20, 20])
    expect(s().playerHands[0]).toHaveLength(2)
  })

  test('with DAS the same hand doubles', () => {
    act(() => {
      playing('5', { playerHands: [[k('7'), k('7', '♥')]], handBets: [20], bet: 20, deck: [k('A'), k('9'), k('2')] })
      s().split()
      jest.runAllTimers()
    })
    expect(s().playerHands[0].map(c => c.value)).toEqual(['7', 'A'])
    expect(s().suggestedAction).toBe('double')
    expect(s().canDoubleNow()).toBe(true)
  })

  test('no surrender after a split: 8-7 vs K hits', () => {
    act(() => {
      playing('K', { playerHands: [[k('8'), k('8', '♥')]], handBets: [20], bet: 20, deck: [k('7'), k('2'), k('3')] })
      s().split()
      jest.runAllTimers()
    })
    expect(s().playerHands[0].map(c => c.value)).toEqual(['8', '7'])
    expect(s().suggestedAction).toBe('hit')
  })

  test('a double you can’t afford: 11 vs 6 hits', () => {
    setBalance(30)
    act(() => { playing('6', { playerHands: [[k('6'), k('5')]], handBets: [20], bet: 20 }) })
    reAssist()
    expect(s().suggestedAction).toBe('hit')
    setBalance(1000)
    reAssist()
    expect(s().suggestedAction).toBe('double')
  })

  test('a split you can’t afford: 8-8 vs 6 is played as 16 (stand)', () => {
    setBalance(30)
    act(() => { playing('6', { playerHands: [[k('8'), k('8', '♥')]], handBets: [20], bet: 20 }) })
    reAssist()
    expect(s().suggestedAction).toBe('stand')
  })
})

describe('a two-card 21 after a split', () => {
  const k = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })
  const s = () => useBlackjackStore.getState()
  beforeEach(() => useProfileStore.setState({
    profiles: [{ id: 'p1', name: 'T', bankrollMode: 'finite', balance: 1000, createdAt: 0, startingBalance: 1000,
      trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p1',
  }))

  test('is paid 1:1 as a win, not 3:2 as a blackjack', () => {
    act(() => {
      useBlackjackStore.setState({
        phase: 'playing', activeHandIndex: 0, tableRules: DEFAULT_TABLE_RULES, assistEnabled: false,
        dealerHand: [k('10'), { ...k('7'), faceDown: true }],
        playerHands: [[k('K'), k('Q', '♥')]], handBets: [20], bet: 20, deck: [k('A'), k('5'), k('2')],
      })
      s().split()
      jest.runAllTimers()
    })
    expect(s().playerHands.map(h => h.map(c => c.value))).toEqual([['K', 'A'], ['Q', '5']])
    act(() => { s().stand(); s().stand(); jest.runAllTimers() })
    // Hand 1: 21 vs 17 wins $20 (not $30); hand 2: 15 vs 17 loses $20.
    expect(s().lastDelta).toBe(0)
    expect(s().lastOutcome).toBe('win')
  })
})

describe('split aces: one card each; resplit only with the option', () => {
  const k = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })
  const s = () => useBlackjackStore.getState()
  const vals = () => s().playerHands.map(h => h.map(c => c.value))
  beforeEach(() => useProfileStore.setState({
    profiles: [{ id: 'p1', name: 'T', bankrollMode: 'finite', balance: 1000, createdAt: 0, startingBalance: 1000,
      trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p1',
  }))
  function splitAces(resplitAces: boolean, deck: Card['value'][]) {
    act(() => {
      useBlackjackStore.setState({
        phase: 'playing', activeHandIndex: 0, assistEnabled: true,
        tableRules: { ...DEFAULT_TABLE_RULES, resplitAces },
        dealerHand: [k('10'), { ...k('7'), faceDown: true }],
        playerHands: [[k('A'), k('A', '♥')]], handBets: [20], bet: 20, deck: deck.map(v => k(v)),
      })
      s().split()
      jest.runAllTimers()
    })
  }

  test('each split ace gets one card and stands: the round settles with no moves', () => {
    splitAces(false, ['K', '5', '2', '3'])
    expect(vals()).toEqual([['A', 'K'], ['A', '5']])
    expect(s().phase).toBe('result')
  })

  test('a second ace can’t be split again when Resplit aces is off: it stands too', () => {
    splitAces(false, ['A', '5', '2', '3'])
    expect(vals()).toEqual([['A', 'A'], ['A', '5']])
    expect(s().phase).toBe('result')
  })

  test('with Resplit aces on, A-A may split again, but never hit or double', () => {
    splitAces(true, ['A', '5', '9', '6', '2', '3'])
    expect(vals()).toEqual([['A', 'A'], ['A', '5']])
    expect(s().phase).toBe('playing')
    expect(s().canSplitNow()).toBe(true)
    expect(s().canHitNow()).toBe(false)
    expect(s().canDoubleNow()).toBe(false)
    expect(s().suggestedAction).toBe('split')
    act(() => { s().hit() })
    act(() => { s().doubleDown() })
    expect(vals()).toEqual([['A', 'A'], ['A', '5']])
    act(() => { s().split(); jest.runAllTimers() })
    expect(vals()).toEqual([['A', '9'], ['A', '6'], ['A', '5']])
    expect(s().phase).toBe('result')
  })

  test('other split pairs play on as before', () => {
    act(() => {
      useBlackjackStore.setState({
        phase: 'playing', activeHandIndex: 0, assistEnabled: false, tableRules: DEFAULT_TABLE_RULES,
        dealerHand: [k('10'), { ...k('7'), faceDown: true }],
        playerHands: [[k('8'), k('8', '♥')]], handBets: [20], bet: 20, deck: [k('2'), k('3'), k('4'), k('5')],
      })
      s().split()
      jest.runAllTimers()
    })
    expect(s().phase).toBe('playing')
    expect(s().canHitNow()).toBe(true)
    act(() => { s().hit() })
    expect(vals()[0]).toEqual(['8', '2', '4'])
  })
})

describe('early surrender: decide before the dealer checks for blackjack', () => {
  const k = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })
  const s = () => useBlackjackStore.getState()
  const stats = () => useProfileStore.getState().profiles[0].stats.blackjack
  beforeEach(() => useProfileStore.setState({
    profiles: [{ id: 'p1', name: 'T', bankrollMode: 'finite', balance: 1000, createdAt: 0, startingBalance: 1000,
      trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p1',
  }))
  // Deal order: player, dealer up card, player, dealer hole card. One deck so a short stack doesn't reshuffle.
  function dealFrom(top: Card['value'][], surrender: 'early' | 'late' = 'early') {
    act(() => {
      useBlackjackStore.setState({
        deck: [...top.map(v => k(v)), ...Array(20).fill(k('2'))], bet: 15, assistEnabled: true,
        tableRules: { ...DEFAULT_TABLE_RULES, deckCount: 1, continuousShuffle: false, surrender },
      })
      s().deal()
      jest.runAllTimers()
    })
  }
  const hole = () => s().dealerHand[1]

  test('a dealer blackjack under an ace doesn’t end the hand at the deal: you can still surrender for half', () => {
    dealFrom(['10', 'A', '6', 'K']) // you 16, dealer A-K
    expect(s().phase).toBe('playing')
    expect(hole().faceDown).toBe(true)
    expect(s().suggestedAction).toBe('surrender')
    act(() => { s().surrender() })
    expect(s().phase).toBe('result')
    expect(s().lastDelta).toBe(-7)
    expect(hole().faceDown).toBe(false) // the hole card is shown
    expect(stats().net).toBe(-7)
  })

  test('any other move first checks for the blackjack: you lose the original bet, and the move isn’t made', () => {
    dealFrom(['10', 'A', '6', 'K'])
    expect(s().phase).toBe('playing')
    act(() => { s().hit() })
    expect(s().phase).toBe('result')
    expect(s().playerHands[0]).toHaveLength(2)
    expect(s().lastOutcome).toBe('lose')
    expect(s().lastDelta).toBe(-15)
    expect(hole().faceDown).toBe(false)
    expect(stats().net).toBe(-15)
  })

  test('doubling into a dealer blackjack loses only the original bet', () => {
    dealFrom(['5', 'K', '6', 'A']) // you 11, dealer K-A
    expect(s().phase).toBe('playing')
    expect(s().canDoubleNow()).toBe(true)
    act(() => { s().doubleDown() })
    expect(s().phase).toBe('result')
    expect(s().handBets).toEqual([15])
    expect(s().lastDelta).toBe(-15)
  })

  test('standing does the same', () => {
    dealFrom(['10', 'A', '9', 'K'])
    expect(s().phase).toBe('playing')
    act(() => { s().stand() })
    expect(s().phase).toBe('result')
    expect(s().lastDelta).toBe(-15)
  })

  test('your blackjack against the dealer’s still pushes at once', () => {
    dealFrom(['A', 'A', 'K', 'K'])
    expect(s().phase).toBe('result')
    expect(s().lastOutcome).toBe('push')
  })

  test('no dealer blackjack: the hand plays as normal', () => {
    dealFrom(['10', 'A', '6', '7'])
    act(() => { s().hit() })
    expect(s().playerHands[0]).toHaveLength(3)
  })

  test('late surrender keeps the check at the deal: a dealer blackjack ends the hand', () => {
    dealFrom(['10', 'A', '6', 'K'], 'late')
    expect(s().phase).toBe('result')
    expect(s().lastDelta).toBe(-15)
  })

  test('leaving with the check still pending settles it as a loss', () => {
    dealFrom(['10', 'A', '6', 'K'])
    expect(s().phase).toBe('playing')
    act(() => { s().abandonHand() })
    expect(stats().net).toBe(-15)
    expect(s().phase).toBe('betting')
  })
})

describe('keep last bet', () => {
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
  const s = () => useBlackjackStore.getState()
  const rules = { ...DEFAULT_TABLE_RULES, deckCount: 1, continuousShuffle: false }
  const filler = Array.from({ length: 20 }, () => k('2'))
  // player 10+9 = 19, dealer 9+7 = 16 draws a 2 → 18: player wins
  const winDeck = [k('10'), k('9'), k('9', '♥'), k('7'), ...filler]
  // player 10+6 = 16 stands, dealer 10+9 = 19: player loses
  const loseDeck = [k('10'), k('10', '♥'), k('6'), k('9'), ...filler]
  function playHand(bet: number, deck: Card[], move: () => void = () => s().stand()) {
    act(() => {
      useBlackjackStore.setState({ deck, tableRules: rules, bet })
      s().deal()
      jest.runAllTimers()
      move()
      jest.runAllTimers()
    })
    expect(s().phase).toBe('result')
  }

  test('carriedBet clamps to balance and drops below the minimum', () => {
    expect(carriedBet(50, null)).toBe(50)
    expect(carriedBet(50, 1000)).toBe(50)
    expect(carriedBet(50, 50)).toBe(50)
    expect(carriedBet(50, 40)).toBe(40)
    expect(carriedBet(50, 15)).toBe(15)
    expect(carriedBet(50, 14)).toBe(0)
    expect(carriedBet(0, 1000)).toBe(0)
  })

  test('newHand carries the last bet', () => {
    setProfile(1000)
    playHand(25, winDeck)
    act(() => { s().newHand() })
    expect(s().phase).toBe('betting')
    expect(s().bet).toBe(25)
  })

  test('newHand carries the original bet after a double', () => {
    setProfile(1000)
    // player 6+5 = 11 doubles, draws 10 → 21; dealer 9+7 = 16 draws a 2 → 18
    playHand(25, [k('6'), k('9'), k('5'), k('7'), k('10', '♥'), ...filler], () => s().doubleDown())
    expect(s().handBets).toEqual([50])
    act(() => { s().newHand() })
    expect(s().bet).toBe(25)
  })

  test('newHand clamps to the balance left after a loss', () => {
    setProfile(90)
    playHand(50, loseDeck)
    expect(useProfileStore.getState().profiles[0].balance).toBe(40)
    act(() => { s().newHand() })
    expect(s().bet).toBe(40)
  })

  test('newHand drops the bet when the balance left is under the minimum', () => {
    setProfile(60)
    playHand(50, loseDeck)
    expect(useProfileStore.getState().profiles[0].balance).toBe(10)
    act(() => { s().newHand() })
    expect(s().bet).toBe(0)
  })

  test('abandonHand from playing starts the next visit at $0', () => {
    setProfile(1000)
    act(() => {
      useBlackjackStore.setState({ deck: winDeck, tableRules: rules, bet: 25 })
      s().deal()
      jest.runAllTimers()
      s().abandonHand()
    })
    expect(s().bet).toBe(0)
  })

  test('abandonHand from result starts the next visit at $0', () => {
    setProfile(1000)
    playHand(25, winDeck)
    act(() => { s().abandonHand() })
    expect(s().bet).toBe(0)
  })
})
