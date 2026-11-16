import React from 'react'
import { StyleSheet } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { Card, MEDIUM_CARD } from '../../features/blackjack/components/Card'
import { Hand } from '../../features/blackjack/components/Hand'
import { ActionButtons } from '../../features/blackjack/components/ActionButtons'
import { BetControls } from '../../features/blackjack/components/BetControls'
import { Card as CardType } from '../../lib/types'

const flat = (style: unknown) => StyleSheet.flatten(style as any)
/** Nearest host View ancestor (skips composite wrappers like TouchableOpacity and Text). */
const hostViewAbove = (node: any) => {
  let n = node.parent
  while (n && n.type !== 'View') n = n.parent
  return n
}
const ACE: CardType = { value: 'A', suit: '♥' }
const DOWN: CardType = { value: 'K', suit: '♠', faceDown: true }

const actionProps = {
  suggestedAction: null, canDouble: true, canSplit: true, canSurrender: true,
  onHit: jest.fn(), onStand: jest.fn(), onDouble: jest.fn(), onSplit: jest.fn(), onSurrender: jest.fn(),
}
const betProps = {
  bet: 25, balance: 1000, isInfinite: false,
  onPlaceBet: jest.fn(), onClearBet: jest.fn(), onDeal: jest.fn(),
}

test('a regular card keeps its phone size', () => {
  const tree = render(<Card card={ACE} />).toJSON() as any
  expect(flat(tree.props.style)).toMatchObject({ width: 52, height: 76 })
})

test('a medium card (landscape tables) is 68×99 with margin 5 and 1.3x text', () => {
  const screen = render(<Card card={ACE} size="medium" />)
  const box = flat(screen.toJSON()!.props.style)
  expect(box).toMatchObject({ width: 68, height: 99, margin: 5, borderRadius: 8 })
  expect(MEDIUM_CARD).toEqual({ width: 68, height: 99, margin: 5 })
  expect(flat(screen.getByText('A').props.style).fontSize).toBe(23)
  expect(flat(screen.getByText('♥').props.style).fontSize).toBe(18)
})

test('a face-down medium card has a 47 back glyph', () => {
  const screen = render(<Card card={DOWN} size="medium" />)
  expect(flat(screen.getByText('🂠').props.style).fontSize).toBe(47)
})

test('a large card is 1.5x with scaled text', () => {
  const screen = render(<Card card={ACE} size="large" />)
  const tree = screen.toJSON() as any
  expect(flat(tree.props.style)).toMatchObject({ width: 78, height: 114, margin: 6, borderRadius: 9 })
  expect(flat(screen.getByText('A').props.style).fontSize).toBe(27)
  expect(flat(screen.getByText('♥').props.style).fontSize).toBe(21)
})

test('a large face-down card has a scaled back glyph', () => {
  const screen = render(<Card card={DOWN} size="large" />)
  expect(flat(screen.getByText('🂠').props.style).fontSize).toBe(54)
})

test('a large hand passes the size to its cards and scales its text', () => {
  const screen = render(<Hand hand={[ACE, { value: '9', suit: '♣' }]} label="You" size="large" />)
  const cards = screen.UNSAFE_getAllByType(Card)
  expect(cards).toHaveLength(2)
  cards.forEach(card => expect(card.props.size).toBe('large'))
  expect(flat(screen.getByText('You').props.style).fontSize).toBe(18)
  expect(flat(screen.getByText(/^Score:/).props.style).fontSize).toBe(22)
})

test('large action buttons have bigger text', () => {
  const screen = render(<ActionButtons {...actionProps} size="large" />)
  expect(flat(screen.getByText('Hit').props.style).fontSize).toBe(22)
})

test('column action buttons stack one full-width button per row', () => {
  const screen = render(<ActionButtons {...actionProps} size="large" direction="column" />)
  const btn = hostViewAbove(screen.getByText('Hit'))
  expect(flat(btn.props.style).alignSelf).toBe('stretch')
  expect(flat(hostViewAbove(btn).props.style).flexDirection).toBe('column')
})

test('large bet controls have bigger chips and Deal', () => {
  const screen = render(<BetControls {...betProps} size="large" />)
  expect(flat(screen.getByText('$15').props.style).fontSize).toBe(22)
  expect(flat(screen.getByText('Deal').props.style).fontSize).toBe(22)
})

describe('ActionButtons canHit', () => {
  const props = {
    suggestedAction: null, canDouble: false, canSplit: true, canSurrender: false,
    onHit: jest.fn(), onStand: jest.fn(), onDouble: jest.fn(), onSplit: jest.fn(), onSurrender: jest.fn(),
  }
  test('Hit is disabled when the hand can’t take a card (a split ace)', () => {
    const { getByText } = render(<ActionButtons {...props} canHit={false} />)
    fireEvent.press(getByText('Hit'))
    expect(props.onHit).not.toHaveBeenCalled()
  })
  test('Hit is enabled by default', () => {
    const { getByText } = render(<ActionButtons {...props} />)
    fireEvent.press(getByText('Hit'))
    expect(props.onHit).toHaveBeenCalled()
  })
})
