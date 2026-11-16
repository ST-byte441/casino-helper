import { atRisk, shownBalance } from '../../features/craps/bankroll'
import { ActiveBet } from '../../lib/types'

const bet = (amount: number, odds?: number): ActiveBet => ({ id: String(amount), type: 'pass', amount, odds, working: true })

describe('craps bankroll', () => {
  test('atRisk sums every bet and its odds', () => {
    expect(atRisk([])).toBe(0)
    expect(atRisk([bet(10), bet(5, 20)])).toBe(35)
  })

  test('the shown balance is the settled balance less what is on the table', () => {
    expect(shownBalance(1000, [bet(10), bet(5, 20)])).toBe(965)
    expect(shownBalance(1000, [])).toBe(1000)
  })
})
