import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Card as CardType } from '../../../lib/types'
import { Card } from './Card'
import { scoreHand } from '../engine'

type Props = { hand: CardType[]; label: string; hideScore?: boolean }

export function Hand({ hand, label, hideScore }: Props) {
  const score = hand.some(c => c.faceDown) ? '?' : scoreHand(hand)
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
        {hand.map((card, i) => <Card key={i} card={card} />)}
      </ScrollView>
      {!hideScore && <Text style={styles.score}>Score: {score}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 8 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  cards: { flexDirection: 'row', paddingHorizontal: 8 },
  score: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 6 },
})
