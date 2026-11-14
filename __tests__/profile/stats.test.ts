import {
  emptyStats, classifyBlackjack, classifyNet, applyHands, applyCrapsRoll,
  winRate, gamesNet, refillTotal, parseAddAmount,
} from '../../features/profile/stats'

describe('classify', () => {
  it('blackjack outcomes', () => {
    expect(classifyBlackjack('blackjack')).toBe('win')
    expect(classifyBlackjack('win')).toBe('win')
    expect(classifyBlackjack('lose')).toBe('loss')
    expect(classifyBlackjack('bust')).toBe('loss')
    expect(classifyBlackjack('push')).toBe('push')
  })
  it('net', () => {
    expect(classifyNet(5)).toBe('win')
    expect(classifyNet(-5)).toBe('loss')
    expect(classifyNet(0)).toBe('push')
  })
})

describe('applyHands', () => {
  it('accumulates and keeps biggestWin', () => {
    const empty = emptyStats().blackjack
    const r = applyHands(empty, [
      { result: 'win', delta: 30 }, { result: 'loss', delta: -15 }, { result: 'push', delta: 0 },
    ])
    expect(r).toEqual({ wins: 1, losses: 1, pushes: 1, biggestWin: 30, net: 15 })
    expect(applyHands(r, [{ result: 'win', delta: 10 }]).biggestWin).toBe(30)
    expect(empty.wins).toBe(0)
  })
})

describe('applyCrapsRoll', () => {
  const empty = emptyStats().craps
  it('seven-out', () => {
    expect(applyCrapsRoll(empty, { delta: -10, hadBets: true, phaseChange: 'seven-out', shooterRolls: 0 }))
      .toEqual({ rolls: 1, pointsMade: 0, sevenOuts: 1, biggestWin: 0, net: -10, longestRoll: 0 })
  })
  it('point-made', () => {
    const r = applyCrapsRoll(empty, { delta: 20, hadBets: true, phaseChange: 'point-made' })
    expect(r.pointsMade).toBe(1)
    expect(r.biggestWin).toBe(20)
  })
  it('ignores rolls without bets', () => {
    expect(applyCrapsRoll(empty, { delta: 0, hadBets: false, phaseChange: 'seven-out' })).toEqual(empty)
  })
  it('longestRoll keeps the longest shooter run seen', () => {
    const r1 = applyCrapsRoll(empty, { delta: 0, hadBets: true, shooterRolls: 5 })
    expect(r1.longestRoll).toBe(5)
    const r2 = applyCrapsRoll(r1, { delta: 0, hadBets: true, shooterRolls: 2 })
    expect(r2.longestRoll).toBe(5)
  })
  it('natural does not touch sevenOuts', () => {
    const r = applyCrapsRoll(empty, { delta: 10, hadBets: true, phaseChange: 'natural' })
    expect(r.sevenOuts).toBe(0)
    expect(r.rolls).toBe(1)
  })
})

describe('summaries', () => {
  it('winRate', () => {
    expect(winRate({ wins: 3, losses: 1, pushes: 5, biggestWin: 0, net: 0 })).toBe(0.75)
    expect(winRate({ wins: 0, losses: 0, pushes: 5, biggestWin: 0, net: 0 })).toBeNull()
  })
  it('gamesNet', () => {
    const s = emptyStats()
    s.blackjack.net = 10; s.baccarat.net = -4; s.craps.net = 7
    s.roulette.net = -2
    expect(gamesNet(s)).toBe(11)
  })
  it('refillTotal', () => {
    expect(refillTotal([{ amount: 100, at: 1 }, { amount: 50, at: 2 }])).toBe(150)
  })
})

describe('parseAddAmount', () => {
  it('accepts whole positive dollars', () => {
    expect(parseAddAmount('250')).toBe(250)
    expect(parseAddAmount(' 40 ')).toBe(40)
  })
  it.each(['12.5', '0', '-5', '', 'abc', '1e3'])('rejects %p', t => {
    expect(parseAddAmount(t)).toBeNull()
  })
})
