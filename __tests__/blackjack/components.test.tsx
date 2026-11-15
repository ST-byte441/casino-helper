import React from 'react'
import { StyleSheet } from 'react-native'
import { render } from '@testing-library/react-native'
import { Card } from '../../features/blackjack/components/Card'
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
