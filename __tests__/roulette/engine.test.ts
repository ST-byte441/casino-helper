import {
  pocketLabel, pocketColor, wheelSequence, zeroPockets, PAYOUTS, isInsideKind,
  makeBetId, allBets, betById, validateBets, settleSpin, pickPocket, totalStake,
} from '../../features/roulette/engine'
import { RouletteWheel } from '../../lib/types'

const wheels: RouletteWheel[] = ['single', 'double', 'triple']
const ids = (w: RouletteWheel) => allBets(w).map(b => b.id)

describe('wheelSequence', () => {
  it.each([['single', 37], ['double', 38], ['triple', 39]] as const)('%s length', (w, n) => {
    const seq = wheelSequence(w)
    expect(seq).toHaveLength(n)
    for (let i = 1; i <= 36; i++) expect(seq.filter(p => p === i)).toHaveLength(1)
    zeroPockets(w).forEach(z => expect(seq).toContain(z))
  })
  it('starts correctly', () => {
    expect(wheelSequence('double').slice(0, 4)).toEqual([0, 28, 9, 26])
    expect(wheelSequence('triple').slice(0, 3)).toEqual([0, -2, -1])
  })
  it('zeroPockets board order', () => {
    expect(zeroPockets('single')).toEqual([0])
    expect(zeroPockets('double')).toEqual([0, -1])
    expect(zeroPockets('triple')).toEqual([0, -2, -1])
  })
})

describe('pockets', () => {
  it('color and label', () => {
    expect(pocketColor(1)).toBe('red')
    expect(pocketColor(10)).toBe('black')
    expect(pocketColor(-1)).toBe('green')
    expect(pocketLabel(-2)).toBe('000')
    expect(pocketLabel(-1)).toBe('00')
    expect(pocketLabel(17)).toBe('17')
  })
})

describe('catalogue', () => {
  it('counts and unique ids', () => {
    expect(allBets('single')).toHaveLength(157)
    expect(allBets('double')).toHaveLength(161)
    expect(allBets('triple')).toHaveLength(155)
    wheels.forEach(w => expect(new Set(ids(w)).size).toBe(ids(w).length))
  })
  it('double zero bets', () => {
    const i = ids('double')
    ;['split:00-0', 'basket:0-1-2', 'basket:00-0-2', 'basket:00-2-3', 'firstFive:00-0-1-2-3'].forEach(x => expect(i).toContain(x))
    expect(i.some(x => x.startsWith('firstFour:'))).toBe(false)
  })
  it('single zero bets', () => {
    const i = ids('single')
    expect(i).toContain('firstFour:0-1-2-3')
    expect(i).toContain('basket:0-2-3')
    expect(i.some(x => x.startsWith('firstFive:'))).toBe(false)
  })
  it('triple zero bets', () => {
    const i = ids('triple')
    expect(i).toContain('split:000-0')
    expect(i).toContain('split:000-00')
    expect(i).not.toContain('split:0-1')
    ;['basket:', 'firstFive:', 'firstFour:'].forEach(p => expect(i.some(x => x.startsWith(p))).toBe(false))
  })
  it('betById and makeBetId', () => {
    expect(betById('double', 'straight:17')?.pockets).toEqual([17])
    expect(betById('single', 'firstFive:00-0-1-2-3')).toBeUndefined()
    expect(makeBetId('split', [0, -1])).toBe('split:00-0')
    expect(makeBetId('red', [])).toBe('red')
    expect(makeBetId('dozen', [])).toBe('dozen')
  })
  it('isInsideKind', () => {
    expect(isInsideKind('straight')).toBe(true)
    expect(isInsideKind('firstFive')).toBe(true)
    expect(isInsideKind('dozen')).toBe(false)
    expect(isInsideKind('red')).toBe(false)
  })
  it('house edge', () => {
    wheels.forEach(w => {
      const n = wheelSequence(w).length
      allBets(w).forEach(b => {
        const k = b.pockets.length
        const ev = (k / n) * PAYOUTS[b.kind] - (n - k) / n
        const expected = b.kind === 'firstFive' ? -3 / 38 : -(n - 36) / n
        expect(ev).toBeCloseTo(expected, 9)
      })
    })
  })
})

describe('validateBets', () => {
  it('rules', () => {
    expect(validateBets({}, 'double')).toBe('Place a bet')
    expect(validateBets({ 'straight:17': 5 }, 'double')).toBe('Inside bets need $10 total')
    expect(validateBets({ 'straight:17': 5, 'split:17-20': 5 }, 'double')).toBeNull()
    expect(validateBets({ red: 5 }, 'double')).toBe('Outside bets need $10 each')
    expect(validateBets({ red: 10, 'dozen:1': 10 }, 'double')).toBeNull()
    expect(validateBets({ 'firstFive:00-0-1-2-3': 10 }, 'single')).toBe('Invalid bet')
  })
  it('totalStake', () => {
    expect(totalStake({ red: 10, 'straight:1': 5 })).toBe(15)
  })
})

describe('settleSpin', () => {
  it('straight and red', () => {
    expect(settleSpin({ 'straight:17': 10, red: 10 }, 'double', 17)).toEqual({ net: 340, winners: ['straight:17'] })
  })
  it('zero loses outside bets', () => {
    const bets = { red: 10, black: 10, odd: 10, even: 10, low: 10, high: 10, 'dozen:1': 10, 'column:1': 10 }
    const r = settleSpin(bets, 'double', 0)
    expect(r.winners).toEqual([])
    expect(r.net).toBe(-80)
  })
  it('first five', () => {
    expect(settleSpin({ 'firstFive:00-0-1-2-3': 10 }, 'double', -1).net).toBe(60)
  })
})

describe('pickPocket', () => {
  it('uses rng', () => {
    const t = wheelSequence('triple')
    expect(pickPocket('triple', () => 0.999999)).toBe(t[t.length - 1])
    expect(pickPocket('single', () => 0)).toBe(wheelSequence('single')[0])
    expect(wheelSequence('double')).toContain(pickPocket('double'))
  })
})
