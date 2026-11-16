import React from 'react'
import { render } from '@testing-library/react-native'
import { HowToPlay as Blackjack } from '../../features/blackjack/components/HowToPlay'
import { HowToPlay as Craps } from '../../features/craps/components/HowToPlay'
import { HowToPlay as Roulette } from '../../features/roulette/components/HowToPlay'
import { HowToPlay as Baccarat } from '../../features/baccarat/components/HowToPlay'
import { BACCARAT_MIN_MAIN_BET } from '../../lib/constants'
import { PAYOUTS } from '../../features/roulette/engine'

const text = (ui: React.ReactElement) => {
  const { getByTestId } = render(ui)
  return getByTestId('how-to-play')
}

// Each guide states the payouts and rules the engine uses (checked against the engines when written).
describe('How to play guides', () => {
  test('blackjack', () => {
    const t = text(<Blackjack visible onClose={jest.fn()} />)
    expect(t).toHaveTextContent(/How to play blackjack/)
    for (const re of [/closer to 21/, /3 to 2/, /6 to 5/, /push/, /soft 17/, /Hit/, /Stand/, /Double/, /Split/, /Surrender/])
      expect(t).toHaveTextContent(re)
  })

  test('craps', () => {
    const t = text(<Craps visible onClose={jest.fn()} />)
    expect(t).toHaveTextContent(/How to play craps/)
    for (const re of [/7 or 11/, /2, 3 or 12/, /seven-out/, /7 to 6/, /7 to 5/, /9 to 5/, /Hard 6 and 8 pay 9 to 1/,
      /Hard 4 and 10 pay 7 to 1/, /true odds/, /Crapless/, /Easy Craps/])
      expect(t).toHaveTextContent(re)
  })

  test('roulette, with the engine’s payouts', () => {
    const t = text(<Roulette visible onClose={jest.fn()} />)
    expect(t).toHaveTextContent(/How to play roulette/)
    expect(PAYOUTS).toMatchObject({ straight: 35, split: 17, street: 11, corner: 8, firstFive: 6, sixline: 5, dozen: 2, red: 1 })
    for (const re of [/35 to 1/, /17 to 1/, /11 to 1/, /8 to 1/, /6 to 1/, /5 to 1/, /2 to 1/, /1 to 1/,
      /2\.7%/, /5\.26%/, /7\.69%/])
      expect(t).toHaveTextContent(re)
  })

  test('baccarat', () => {
    const t = text(<Baccarat visible onClose={jest.fn()} />)
    expect(t).toHaveTextContent(/How to play baccarat/)
    expect(BACCARAT_MIN_MAIN_BET).toBe(15)
    for (const re of [/Player/, /Banker/, /5% commission/, /Tie pays 8 to 1/, /11 to 1/, /\$15/, /natural/, /Squeeze/])
      expect(t).toHaveTextContent(re)
  })
})
