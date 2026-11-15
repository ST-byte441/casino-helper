import React from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Text } from '../../../components/Text'
import { Card as CardType } from '../../../lib/types'
import { Card } from '../../blackjack/components/Card'
import { scoreHand, isNatural } from '../engine'
import { sizedStyles, TableSize } from '../../../lib/tableSize'
import { CardSize } from '../../blackjack/components/Card'

type Props = {
  hand: CardType[]
  label: string
  /** Cards shown in their slots (face-down or face-up). Defaults to the whole hand. */
  shown?: number
  /** Leading cards that are face-up. Defaults to the whole hand. */
  faceUp?: number
  highlight?: boolean
  size?: TableSize
  /** Defaults to `size`; landscape tables use 'medium' so three cards fit a column. */
  cardSize?: CardSize
}

export function HandDisplay({ hand, label, shown = hand.length, faceUp = hand.length, highlight, size = 'regular', cardSize = size }: Props) {
  const styles = SHEETS[size]
  if (hand.length === 0) return null
  const visible = hand.slice(0, shown)
  const score = scoreHand(hand.slice(0, faceUp))
  const natural = faceUp === hand.length && isNatural(hand)
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.cards, highlight && styles.highlight]}
      >
        {visible.map((card, i) => (
          <Card key={`${i}-${i < faceUp ? 'up' : 'down'}`} card={i < faceUp ? card : { ...card, faceDown: true }} size={cardSize} />
        ))}
      </ScrollView>
      <View style={styles.scoreRow}>
        {faceUp > 0 && <Text testID="hand-score" style={styles.score}>{score}</Text>}
        {natural && <View style={styles.badge}><Text style={styles.badgeText}>Natural</Text></View>}
      </View>
    </View>
  )
}

const base = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 12 },
  label: { color: '#aaa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  cards: { flexDirection: 'row', paddingHorizontal: 8 },
  highlight: { borderWidth: 2, borderColor: '#FFD700', borderRadius: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 28 },
  score: { color: '#fff', fontSize: 22, fontWeight: '700' },
  badge: { backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#13131f', fontSize: 11, fontWeight: '700' },
})

const SHEETS = sizedStyles(base, {
  container: { paddingVertical: 18 },
  label: { fontSize: 18, marginBottom: 12 },
  cards: { paddingHorizontal: 8 },
  scoreRow: { gap: 12, marginTop: 12, minHeight: 42 },
  score: { fontSize: 32 },
  badge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 3 },
  badgeText: { fontSize: 15 },
})
