import { revealOrder, handView } from '../../features/baccarat/reveal'
import { Card } from '../../lib/types'

const c = (value: Card['value']): Card => ({ value, suit: '♠' })

describe('revealOrder', () => {
  test('two-card hands: P1,B1,P2,B2', () =>
    expect(revealOrder([c('9'), c('K')], [c('8'), c('K')])).toEqual([
      { side: 'player', index: 0 }, { side: 'banker', index: 0 },
      { side: 'player', index: 1 }, { side: 'banker', index: 1 },
    ]))

  test('both draw: P3 before B3', () =>
    expect(revealOrder([c('2'), c('3'), c('4')], [c('2'), c('2'), c('5')]).slice(4)).toEqual([
      { side: 'player', index: 2 }, { side: 'banker', index: 2 },
    ]))

  test('player stands, banker draws: only B3 appended', () =>
    expect(revealOrder([c('3'), c('4')], [c('2'), c('2'), c('5')]).slice(4)).toEqual([
      { side: 'banker', index: 2 },
    ]))
})

describe('handView', () => {
  test('at start shows 2 face-down each', () => {
    const o = revealOrder([c('2'), c('3'), c('4')], [c('2'), c('2')])
    expect(handView(o, 0, 'player')).toEqual({ shown: 2, faceUp: 0 })
    expect(handView(o, 0, 'banker')).toEqual({ shown: 2, faceUp: 0 })
  })

  test('third card slot hidden until its turn', () => {
    const o = revealOrder([c('2'), c('3'), c('4')], [c('2'), c('2')])
    expect(handView(o, 3, 'player')).toEqual({ shown: 2, faceUp: 2 })
    expect(handView(o, 4, 'player')).toEqual({ shown: 3, faceUp: 2 })
    expect(handView(o, 5, 'player')).toEqual({ shown: 3, faceUp: 3 })
  })
})
