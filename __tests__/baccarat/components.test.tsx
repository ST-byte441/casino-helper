import React from 'react'
import { render } from '@testing-library/react-native'
import { HandDisplay } from '../../features/baccarat/components/HandDisplay'
import { ResultBanner } from '../../features/baccarat/components/ResultBanner'
import { Card } from '../../lib/types'

const c = (value: Card['value']): Card => ({ value, suit: '♠' })

describe('HandDisplay', () => {
  test('partial reveal hides unshown cards and scores only face-up cards', () => {
    const { queryByText, getByTestId, getAllByText } = render(
      <HandDisplay hand={[c('9'), c('K'), c('5')]} label="Player" shown={2} faceUp={1} />
    )
    expect(queryByText('5')).toBeNull()
    expect(queryByText('K')).toBeNull()
    expect(getAllByText('🂠')).toHaveLength(1)
    expect(getByTestId('hand-score')).toHaveTextContent('9')
  })

  test('no score while nothing is face-up', () => {
    const { queryByTestId } = render(
      <HandDisplay hand={[c('9'), c('K')]} label="Player" shown={2} faceUp={0} />
    )
    expect(queryByTestId('hand-score')).toBeNull()
  })

  test('defaults to fully revealed (sandbox usage)', () => {
    const { getByText, getByTestId } = render(<HandDisplay hand={[c('9'), c('K')]} label="Player" />)
    expect(getByText('K')).toBeTruthy()
    expect(getByTestId('hand-score')).toHaveTextContent('9')
    expect(getByText('Natural')).toBeTruthy()
  })
})

describe('ResultBanner', () => {
  test('player win shows score line and delta', () => {
    const { getByText } = render(
      <ResultBanner outcome="player" playerScore={7} bankerScore={6} netDelta={20} />
    )
    expect(getByText('Player Wins 7 to 6')).toBeTruthy()
    expect(getByText('+$20')).toBeTruthy()
  })

  test('banker win lists banker score first', () => {
    const { getByText } = render(
      <ResultBanner outcome="banker" playerScore={3} bankerScore={8} netDelta={-10} />
    )
    expect(getByText('Banker Wins 8 to 3')).toBeTruthy()
    expect(getByText('-$10')).toBeTruthy()
  })

  test('tie copy', () => {
    const { getByText } = render(
      <ResultBanner outcome="tie" playerScore={5} bankerScore={5} netDelta={0} />
    )
    expect(getByText('Tie 5 to 5')).toBeTruthy()
  })

  test('stays on screen with no timer', () => {
    jest.useFakeTimers()
    const { getByText } = render(
      <ResultBanner outcome="player" playerScore={7} bankerScore={6} netDelta={20} />
    )
    jest.advanceTimersByTime(5000)
    expect(getByText('Player Wins 7 to 6')).toBeTruthy()
    jest.useRealTimers()
  })
})
