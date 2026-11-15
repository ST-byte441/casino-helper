import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { BetPanel } from '../../features/baccarat/components/BetPanel'
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

describe('BetPanel', () => {
  function panel(mainChip = 25, sideChip = 5) {
    const onAdd = jest.fn(), onMainChipChange = jest.fn(), onSideChipChange = jest.fn()
    const utils = render(
      <BetPanel bets={{}} assistEnabled={false} mainChip={mainChip} sideChip={sideChip}
        onMainChipChange={onMainChipChange} onSideChipChange={onSideChipChange}
        onAdd={onAdd} onClear={jest.fn()} />
    )
    return { ...utils, onAdd, onMainChipChange, onSideChipChange }
  }

  test('main chips are $15 / $25 / $50 / $100 and side chips are $1 / $5 / $10 / $25', () => {
    const { getByTestId, onMainChipChange, onSideChipChange } = panel()
    for (const v of [15, 25, 50, 100]) getByTestId(`main-chip-${v}`)
    for (const v of [1, 5, 10, 25]) getByTestId(`side-chip-${v}`)
    fireEvent.press(getByTestId('main-chip-100'))
    fireEvent.press(getByTestId('side-chip-1'))
    expect(onMainChipChange).toHaveBeenCalledWith(100)
    expect(onSideChipChange).toHaveBeenCalledWith(1)
  })

  test('Player and Banker add the main chip', () => {
    const { getByText, onAdd } = panel(50, 5)
    fireEvent.press(getByText('Player'))
    fireEvent.press(getByText('Banker'))
    expect(onAdd).toHaveBeenNthCalledWith(1, 'player', 50)
    expect(onAdd).toHaveBeenNthCalledWith(2, 'banker', 50)
  })

  test('Tie and pairs add the side chip', () => {
    const { getByText, onAdd } = panel(100, 10)
    fireEvent.press(getByText('Tie\n8:1'))
    fireEvent.press(getByText('P.Pair\n11:1'))
    fireEvent.press(getByText('B.Pair\n11:1'))
    expect(onAdd).toHaveBeenNthCalledWith(1, 'tie', 10)
    expect(onAdd).toHaveBeenNthCalledWith(2, 'player-pair', 10)
    expect(onAdd).toHaveBeenNthCalledWith(3, 'banker-pair', 10)
  })

  test('side bets have a dashed outline, main bets a solid one', () => {
    const { getByTestId } = panel()
    const style = (id: string) => Object.assign({}, ...[getByTestId(id).props.style].flat(Infinity).filter(Boolean))
    expect(style('bet-tie').borderStyle).toBe('dashed')
    expect(style('bet-player-pair').borderStyle).toBe('dashed')
    expect(style('bet-player').borderStyle ?? 'solid').toBe('solid')
  })
})

describe('large sizes', () => {
  const { StyleSheet } = require('react-native')
  const { BACCARAT_CHIPS } = require('../../lib/constants')
  const flat = (s: unknown) => StyleSheet.flatten(s as any)
  const panelProps = {
    bets: {}, assistEnabled: false, mainChip: BACCARAT_CHIPS[0], sideChip: 5,
    onMainChipChange: jest.fn(), onSideChipChange: jest.fn(), onAdd: jest.fn(), onClear: jest.fn(),
  }

  test('a large hand with medium cards: label 18, score 32, cards 68 wide', () => {
    const { getByText, getByTestId, UNSAFE_root } = render(
      <HandDisplay hand={[c('9'), c('K'), c('5')]} label="Player" size="large" cardSize="medium" />)
    expect(flat(getByText('Player').props.style).fontSize).toBe(18)
    expect(flat(getByTestId('hand-score').props.style).fontSize).toBe(32)
    const cards = UNSAFE_root.findAll((n: any) => n.type === 'View' && flat(n.props.style)?.height === 99)
    expect(cards).toHaveLength(3)
    expect(cards.every((n: any) => flat(n.props.style).width === 68)).toBe(true)
  })

  test('cardSize defaults to size: a large hand has 78-wide cards', () => {
    const { UNSAFE_root } = render(<HandDisplay hand={[c('9'), c('K')]} label="Player" size="large" />)
    expect(UNSAFE_root.findAll((n: any) => n.type === 'View' && flat(n.props.style)?.width === 78)).toHaveLength(2)
  })

  test('a natural badge on a large hand is 15', () => {
    const { getByText } = render(<HandDisplay hand={[c('9'), c('K')]} label="Player" size="large" />)
    expect(flat(getByText('Natural').props.style).fontSize).toBe(15)
  })

  test('a large result banner: label 30, delta 26', () => {
    const { getByText } = render(
      <ResultBanner outcome="player" playerScore={9} bankerScore={3} netDelta={15} size="large" />)
    expect(flat(getByText('Player Wins 9 to 3').props.style).fontSize).toBe(30)
    expect(flat(getByText('+$15').props.style).fontSize).toBe(26)
  })

  test('a large bet panel: chips 58, bet buttons min 76 with 16/18 text, Clear 17', () => {
    const { getByTestId, getByText } = render(<BetPanel {...panelProps} bets={{ player: 15 }} size="large" />)
    expect(flat(getByTestId(`main-chip-${BACCARAT_CHIPS[0]}`).props.style)).toMatchObject({ width: 58, height: 58 })
    const player = getByText('Player')
    expect(flat(player.props.style).fontSize).toBe(16)
    const { within } = require('@testing-library/react-native')
    expect(flat(within(getByTestId('bet-player')).getByText('$15').props.style).fontSize).toBe(18)
    let btn: any = player.parent
    while (btn && !(btn.type === 'View' && flat(btn.props.style)?.minHeight)) btn = btn.parent
    expect(flat(btn.props.style).minHeight).toBe(76)
    expect(flat(getByText('Clear Bets').props.style).fontSize).toBe(17)
  })
})
