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

  test('pass odds over the cap are refused with the notice', () => {
    setProfile(10000)
    pointPhase([passBet(10)]) // point 6, 3-4-5x: max 5x = $50
    const s = () => useCrapsStore.getState()
    expect(s().addOdds('b1', 50)).toBe(true)
    expect(s().addOdds('b1', 1)).toBe(false)
    expect(s().notice).toBe('Max odds here is $50')
    expect(s().bets[0].odds).toBe(50)
  })

  test('come odds are capped against the come point, not the table point', () => {
    setProfile(10000)
    pointPhase([{ id: 'c1', type: 'come', amount: 10, working: true, comePoint: 4 }]) // table point 6 (5x)
    const s = () => useCrapsStore.getState()
    expect(s().addOdds('c1', 40)).toBe(false) // 4: 3x = $30
    expect(s().notice).toBe('Max odds here is $30')
    expect(s().addOdds('c1', 30)).toBe(true)
  })

  test("don't pass uses the lay cap (6x under 3-4-5x)", () => {
    setProfile(10000)
    pointPhase([{ id: 'd1', type: 'dont-pass', amount: 10, working: true }])
    const s = () => useCrapsStore.getState()
    expect(s().addOdds('d1', 60)).toBe(true)
    expect(s().addOdds('d1', 1)).toBe(false)
    expect(s().notice).toBe('Max odds here is $60')
  })

  test('odds need a point', () => {
    setProfile(10000)
    pointPhase([{ id: 'c1', type: 'come', amount: 10, working: true }])
    const s = () => useCrapsStore.getState()
    expect(s().addOdds('c1', 5)).toBe(false)
    expect(s().notice).toBe('Odds go on a bet with a point')
    useCrapsStore.setState({ phase: 'come-out', point: null, bets: [passBet(10)] })
    expect(s().addOdds('b1', 5)).toBe(false)
    expect(s().notice).toBe('Odds go on a bet with a point')
  })

  test('removing odds is never refused by the cap', () => {
    setProfile(10000)
    pointPhase([{ ...passBet(10), odds: 80 }]) // over the cap already
    const s = () => useCrapsStore.getState()
    expect(s().addOdds('b1', -10)).toBe(true)
    expect(s().bets[0].odds).toBe(70)
  })

  test('setNotice sets and clears the notice', () => {
    const s = () => useCrapsStore.getState()
    s().setNotice('Make a Pass bet first')
    expect(s().notice).toBe('Make a Pass bet first')
    s().setNotice(null)
    expect(s().notice).toBeNull()
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

describe('come bets merge within a roll', () => {
  const s = () => useCrapsStore.getState()
  const reset = (bets: ActiveBet[] = []) => {
    setProfile(1000)
    useCrapsStore.setState({
      phase: 'point', point: 6, bets, notice: null, selectedChip: null,
      tableRules: { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false },
    })
  }

  test('two COME bets in one roll make one $10 come bet', () => {
    reset()
    expect(s().placeBet('come', 5)).toBe(true)
    expect(s().placeBet('come', 5)).toBe(true)
    expect(s().bets).toEqual([expect.objectContaining({ type: 'come', amount: 10 })])
  })

  test("two DON'T COME bets in one roll merge too; Come and Don't Come stay apart", () => {
    reset()
    s().placeBet('dont-come', 5)
    s().placeBet('dont-come', 5)
    s().placeBet('come', 5)
    expect(s().bets).toEqual([
      expect.objectContaining({ type: 'dont-come', amount: 10 }),
      expect.objectContaining({ type: 'come', amount: 5 }),
    ])
  })

  test('a come bet that travelled stays separate from a new come bet', () => {
    reset()
    s().placeBet('come', 10)
    mockDice(4, 4) // 8: the come bet travels to 8
    s().roll()
    expect(s().bets).toEqual([expect.objectContaining({ type: 'come', amount: 10, comePoint: 8 })])
    expect(s().placeBet('come', 5)).toBe(true)
    expect(s().bets).toHaveLength(2)
    expect(s().bets[0]).toEqual(expect.objectContaining({ amount: 10, comePoint: 8 }))
    expect(s().bets[1]).toEqual(expect.objectContaining({ type: 'come', amount: 5 }))
    expect(s().bets[1].comePoint).toBeUndefined()
  })
})

describe('stale notices', () => {
  const s = () => useCrapsStore.getState()
  const reset = (bets: ActiveBet[]) => {
    setProfile(1000)
    useCrapsStore.setState({
      phase: 'point', point: 6, bets, notice: 'old', selectedChip: null,
      tableRules: { variant: 'craps', oddsMultiple: '3-4-5x', fieldPays3on12: false },
    })
  }

  test('removeBet clears the notice', () => {
    reset([{ id: 'f', type: 'field', amount: 5, working: true }])
    s().removeBet('f')
    expect(s().bets).toEqual([])
    expect(s().notice).toBeNull()
  })

  test('toggleWorking clears the notice', () => {
    reset([{ id: 'p', type: 'place', amount: 6, number: 6, working: true }])
    s().toggleWorking('p')
    expect(s().bets[0].working).toBe(false)
    expect(s().notice).toBeNull()
  })

  test('removeBet on a contract bet says why it stays', () => {
    reset([{ id: 'p', type: 'pass', amount: 10, working: true },
      { id: 'c', type: 'come', amount: 5, working: true, comePoint: 8 }])
    s().removeBet('p')
    expect(s().notice).toBe('Pass is a contract bet once the point is set')
    s().removeBet('c')
    expect(s().notice).toBe('Come bets stay until they win or lose')
    expect(s().bets).toHaveLength(2)
  })
})

describe('clearTable: take down everything allowed', () => {
  const b = (id: string, type: ActiveBet['type'], amount: number, extra: Partial<ActiveBet> = {}): ActiveBet =>
    ({ id, type, amount, working: true, ...extra })
  const s = () => useCrapsStore.getState()

  test('on the come-out every bet comes down, the Pass Line too', () => {
    useCrapsStore.setState({ phase: 'come-out', point: null, notice: null,
      bets: [b('p', 'pass', 10), b('f', 'field', 5), b('h', 'hardway', 1, { number: 6 })] })
    expect(s().clearTable()).toBe(3)
    expect(s().bets).toEqual([])
    expect(s().notice).toBeNull()
  })

  test('after the point: contract bets stay without their odds, the rest come down', () => {
    pointPhase([
      b('p', 'pass', 10, { odds: 20 }), b('c', 'come', 5, { comePoint: 8, odds: 10 }),
      b('pl', 'place', 12, { number: 6 }), b('f', 'field', 5), b('dp', 'dont-pass', 10, { odds: 12 }),
    ])
    useCrapsStore.setState({ notice: null })
    expect(s().clearTable()).toBe(5) // 3 bets down, 2 odds off
    expect(s().bets).toEqual([
      expect.objectContaining({ id: 'p', amount: 10, odds: 0 }),
      expect.objectContaining({ id: 'c', amount: 5, odds: 0, comePoint: 8 }),
    ])
    expect(s().notice).toBe('Pass and Come bets on a point stay up; the rest came down')
  })

  test('a Come bet still in the Come box comes down', () => {
    pointPhase([b('c', 'come', 5)])
    expect(s().clearTable()).toBe(1)
    expect(s().bets).toEqual([])
  })

  test('nothing allowed to come down: the reason line says so and nothing changes', () => {
    pointPhase([b('p', 'pass', 10)])
    expect(s().clearTable()).toBe(0)
    expect(s().bets).toEqual([b('p', 'pass', 10)])
    expect(s().notice).toBe('Pass and Come bets on a point can’t come down')
  })

  test('an empty table is a no-op', () => {
    pointPhase([])
    useCrapsStore.setState({ notice: 'old' })
    expect(s().clearTable()).toBe(0)
    expect(s().notice).toBe('old')
  })

  test('canClear: true only when something can come down', () => {
    pointPhase([b('p', 'pass', 10)])
    expect(s().canClear()).toBe(false)
    pointPhase([b('p', 'pass', 10, { odds: 10 })])
    expect(s().canClear()).toBe(true)
    pointPhase([])
    expect(s().canClear()).toBe(false)
  })
})
