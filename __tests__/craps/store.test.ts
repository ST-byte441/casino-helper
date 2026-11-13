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

import { useCrapsStore } from '../../features/craps/store'
import { useProfileStore } from '../../features/profile/store'
import { emptyStats } from '../../features/profile/stats'
import { ActiveBet } from '../../lib/types'

function setProfile(balance: number, mode: 'finite' | 'infinite' = 'finite') {
  useProfileStore.setState({
    profiles: [{
      id: 'p1', name: 'A', bankrollMode: mode, balance, createdAt: 0,
      startingBalance: balance, trackingSince: 0, refills: [], stats: emptyStats(),
    }],
    activeProfileId: 'p1',
  })
}

function pointPhase(bets: ActiveBet[]) {
  useCrapsStore.setState({
    phase: 'point', point: 6, bets,
    tableRules: { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false },
  })
}

function mockDice(a: number, b: number) {
  // dice = ceil(random * 6), so (n - 0.5) / 6 yields n
  jest.spyOn(Math, 'random').mockReturnValueOnce((a - 0.5) / 6).mockReturnValueOnce((b - 0.5) / 6)
}

const passBet = (amount: number): ActiveBet => ({ id: 'b1', type: 'pass', amount, working: true })

afterEach(() => jest.restoreAllMocks())

describe('odds cap', () => {
  test('addOdds is capped by balance but removal is never blocked', () => {
    setProfile(100)
    pointPhase([passBet(50)])
    const s = () => useCrapsStore.getState()
    s().addOdds('b1', 60)
    expect(s().bets[0].odds ?? 0).toBe(0)
    s().addOdds('b1', 50)
    expect(s().bets[0].odds).toBe(50)
    s().addOdds('b1', -20)
    expect(s().bets[0].odds).toBe(30)
  })

  test('canAfford reflects balance minus money at risk; infinite always true', () => {
    setProfile(100)
    pointPhase([{ ...passBet(50), odds: 20 }])
    expect(useCrapsStore.getState().canAfford(30)).toBe(true)
    expect(useCrapsStore.getState().canAfford(31)).toBe(false)
    setProfile(1, 'infinite')
    expect(useCrapsStore.getState().canAfford(1000)).toBe(true)
    useProfileStore.setState({ activeProfileId: null })
    expect(useCrapsStore.getState().canAfford(1000)).toBe(true)
  })
})

describe('roll recording', () => {
  test('seven-out records stats', () => {
    setProfile(100)
    pointPhase([passBet(10)])
    mockDice(3, 4)
    useCrapsStore.getState().roll()
    const c = useProfileStore.getState().profiles[0].stats.craps
    expect(c).toMatchObject({ rolls: 1, sevenOuts: 1, net: -10 })
  })

  test('point made records pointsMade', () => {
    setProfile(100)
    pointPhase([passBet(10)])
    mockDice(3, 3)
    useCrapsStore.getState().roll()
    expect(useProfileStore.getState().profiles[0].stats.craps.pointsMade).toBe(1)
  })

  test('roll with no bets is not counted', () => {
    setProfile(100)
    pointPhase([])
    mockDice(3, 4)
    useCrapsStore.getState().roll()
    expect(useProfileStore.getState().profiles[0].stats.craps.rolls).toBe(0)
  })
})
