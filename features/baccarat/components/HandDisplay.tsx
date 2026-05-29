import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Card as CardType } from '../../../lib/types'
import { Card } from '../../blackjack/components/Card'
import { scoreHand, isNatural } from '../engine'

type Props = {
  hand: CardType[]
  label: string
}

export function HandDisplay({ hand, label }: Props) {
  if (hand.length === 0) return null
  const score = scoreHand(hand)
  const natural = isNatural(hand)
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
        {hand.map((card, i) => <Card key={i} card={card} />)}
      </ScrollView>
      <View style={styles.scoreRow}>
        <Text style={styles.score}>{score}</Text>
        {natural && <View style={styles.badge}><Text style={styles.badgeText}>Natural</Text></View>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 12 },
  label: { color: '#aaa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  cards: { flexDirection: 'row', paddingHorizontal: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  score: { color: '#fff', fontSize: 22, fontWeight: '700' },
  badge: { backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#13131f', fontSize: 11, fontWeight: '700' },
})
