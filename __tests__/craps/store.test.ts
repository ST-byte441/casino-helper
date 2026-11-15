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
import { minBuyLayAmount } from '../../features/craps/engine'

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

  test('longest roll counts rolls a shooter survives before the seven-out', () => {
    setProfile(1000)
    useCrapsStore.setState({
      phase: 'come-out', point: null, bets: [passBet(10)], shooterRolls: 0,
      tableRules: { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false },
    })
    const roll = (a: number, b: number) => { mockDice(a, b); useCrapsStore.getState().roll() }
    roll(3, 3) // point 6 set
    roll(2, 2) // 4
    roll(2, 3) // 5
    roll(3, 4) // seven-out: not counted as survived
    expect(useProfileStore.getState().profiles[0].stats.craps.longestRoll).toBe(3)
    expect(useCrapsStore.getState().shooterRolls).toBe(0)
    useCrapsStore.setState({ bets: [{ ...passBet(10), id: 'b2' }] })
    roll(4, 4) // new shooter: point 8
    roll(3, 4) // seven-out after 1 roll
    expect(useProfileStore.getState().profiles[0].stats.craps.longestRoll).toBe(3)
  })

  test('roll with no bets is not counted', () => {
    setProfile(100)
    pointPhase([])
    mockDice(3, 4)
    useCrapsStore.getState().roll()
    expect(useProfileStore.getState().profiles[0].stats.craps.rolls).toBe(0)
  })
})

describe('working status (rules doc: Working and Not Working)', () => {
  beforeEach(() => setProfile(10000))

  function comeOut() {
    useCrapsStore.setState({
      phase: 'come-out', point: null, bets: [],
      tableRules: { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false },
    })
  }

  test('a lay placed on the come-out is working; a place bet is off', () => {
    comeOut()
    useCrapsStore.getState().placeBet('lay', 40, 4)
    useCrapsStore.getState().placeBet('place', 10, 5)
    const bets = useCrapsStore.getState().bets
    expect(bets.find(b => b.type === 'lay')!.working).toBe(true)
    expect(bets.find(b => b.type === 'place')!.working).toBe(false)
  })

  test('after the point is made, lay stays working while place and buy turn off', () => {
    pointPhase([
      { id: 'l', type: 'lay', amount: 40, number: 4, working: true },
      { id: 'p', type: 'place', amount: 10, number: 5, working: true },
      { id: 'b', type: 'buy', amount: 20, number: 10, working: true },
    ])
    mockDice(3, 3) // point 6 made
    useCrapsStore.getState().roll()
    const bets = useCrapsStore.getState().bets
    expect(useCrapsStore.getState().phase).toBe('come-out')
    expect(bets.find(b => b.id === 'l')!.working).toBe(true)
    expect(bets.find(b => b.id === 'p')!.working).toBe(false)
    expect(bets.find(b => b.id === 'b')!.working).toBe(false)
  })

  test('a lay working on the come-out wins on a 7', () => {
    comeOut()
    useCrapsStore.getState().placeBet('lay', 40, 4)
    mockDice(3, 4)
    useCrapsStore.getState().roll()
    expect(useCrapsStore.getState().lastDelta).toBe(19)
  })

  test('a come bet cannot be placed on the come-out', () => {
    comeOut()
    useCrapsStore.getState().placeBet('come', 10)
    expect(useCrapsStore.getState().bets).toHaveLength(0)
  })
})

describe('Buy and Lay minimums in the store', () => {
  beforeEach(() => setProfile(10000))

  test('a buy below $20 or a lay that would win under $20 is refused', () => {
    pointPhase([])
    useCrapsStore.getState().placeBet('buy', 1, 6)
    useCrapsStore.getState().placeBet('lay', 1, 4)
    expect(useCrapsStore.getState().bets).toHaveLength(0)
    useCrapsStore.getState().placeBet('buy', 20, 6)
    useCrapsStore.getState().placeBet('lay', 40, 4)
    expect(useCrapsStore.getState().bets).toHaveLength(2)
  })

  test('adding to an existing buy is fine once the total meets the minimum', () => {
    pointPhase([{ id: 'b', type: 'buy', amount: 20, number: 6, working: true }])
    useCrapsStore.getState().placeBet('buy', 5, 6)
    expect(useCrapsStore.getState().bets[0].amount).toBe(25)
  })

  test('reducing a buy below the minimum takes it down', () => {
    pointPhase([{ id: 'b', type: 'buy', amount: 25, number: 6, working: true }])
    useCrapsStore.getState().reduceBet('b', 10)
    expect(useCrapsStore.getState().bets).toHaveLength(0)
  })
})

describe('placement notices', () => {
  const s = () => useCrapsStore.getState()
  const reset = (phase: 'come-out' | 'point', variant: 'craps' | 'crapless' = 'craps') => {
    setProfile(1000)
    useCrapsStore.setState({
      phase, point: phase === 'point' ? 6 : null, bets: [], notice: null, selectedChip: null,
      tableRules: { variant, oddsMultiple: '3-4-5x', fieldPays3on12: false },
    })
  }
  const refused = (ok: boolean, msg: string) => {
    expect(ok).toBe(false)
    expect(s().notice).toBe(msg)
    expect(s().bets).toHaveLength(0)
  }

  test('variant refusal', () => {
    reset('come-out', 'crapless')
    refused(s().placeBet('dont-pass', 10), 'Not offered in this game')
  })
  test('come / dont-come on the come-out', () => {
    reset('come-out')
    refused(s().placeBet('come', 10), 'Come bets open once a point is set')
    refused(s().placeBet('dont-come', 10), 'Come bets open once a point is set')
  })
  test('line bets in the point phase', () => {
    reset('point')
    refused(s().placeBet('pass', 10), 'Line bets are made on the come-out')
  })
  test('buy and lay minimums', () => {
    reset('point')
    refused(s().placeBet('buy', 10, 4), 'Minimum buy is $20')
    refused(s().placeBet('lay', 5, 4), `Minimum lay is $${minBuyLayAmount('lay', 4)}`)
  })
  test('horn and world units', () => {
    reset('point')
    refused(s().placeBet('horn', 6), 'Horn bets go in $4 units')
    refused(s().placeBet('world', 7), 'World bets go in $5 units')
    expect(s().placeBet('horn', 8)).toBe(true)
  })
  test('adding $4 to an existing $4 horn is accepted', () => {
    reset('point')
    s().placeBet('horn', 4)
    expect(s().placeBet('horn', 4)).toBe(true)
    expect(s().bets[0].amount).toBe(8)
  })
  test('balance refusal, odds balance refusal, and clearing', () => {
    reset('come-out')
    setProfile(50)
    refused(s().placeBet('pass', 60), 'Not enough balance')
    expect(s().placeBet('pass', 50)).toBe(true)
    expect(s().notice).toBeNull()
    useCrapsStore.setState({ phase: 'point', point: 6 })
    expect(s().addOdds(s().bets[0].id, 10)).toBe(false)
    expect(s().notice).toBe('Not enough balance')
    expect(s().addOdds(s().bets[0].id, -10)).toBe(true)
    expect(s().notice).toBeNull()
  })
  test('notice clears on roll', () => {
    reset('come-out')
    s().placeBet('come', 10)
    expect(s().notice).not.toBeNull()
    mockDice(1, 2)
    s().roll()
    expect(s().notice).toBeNull()
  })
  test('selectChip toggles; survives roll; reset by setTableRules and resetToSetup', () => {
    reset('come-out')
    s().selectChip(5)
    expect(s().selectedChip).toBe(5)
    s().selectChip(5)
    expect(s().selectedChip).toBeNull()
    s().selectChip(25)
    mockDice(1, 2)
    s().roll()
    expect(s().selectedChip).toBe(25)
    s().resetToSetup()
    expect(s().selectedChip).toBeNull()
    s().selectChip(25)
    s().setTableRules({ variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false })
    expect(s().selectedChip).toBeNull()
  })
})
