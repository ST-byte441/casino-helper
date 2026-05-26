import { View, Text, StyleSheet } from 'react-native'
import { Card as CardType } from '../../../lib/types'
import { RED_SUITS } from '../../../lib/constants'

type Props = { card: CardType }

export function Card({ card }: Props) {
  if (card.faceDown) {
    return <View style={[styles.card, styles.faceDown]}><Text style={styles.back}>🂠</Text></View>
  }
  const isRed = RED_SUITS.includes(card.suit)
  return (
    <View style={styles.card}>
      <Text style={[styles.value, isRed && styles.red]}>{card.value}</Text>
      <Text style={[styles.suit, isRed && styles.red]}>{card.suit}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { width: 52, height: 76, backgroundColor: '#fff', borderRadius: 6, margin: 4,
    justifyContent: 'center', alignItems: 'center', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  faceDown: { backgroundColor: '#1a3a5c' },
  value: { fontSize: 18, fontWeight: '700', color: '#111' },
  suit: { fontSize: 14, color: '#111' },
  red: { color: '#cc0000' },
  back: { fontSize: 36, color: '#fff' },
})
