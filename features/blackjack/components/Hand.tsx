import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Card as CardType } from '../../../lib/types'
import { Card } from './Card'
import { scoreHand } from '../engine'

type Props = { hand: CardType[]; label: string; hideScore?: boolean; active?: boolean }

export function Hand({ hand, label, hideScore, active }: Props) {
  const score = hand.some(c => c.faceDown) ? '?' : scoreHand(hand)
  return (
    <View style={[styles.container, active && styles.activeContainer]}>
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
        {hand.map((card, i) => <Card key={i} card={card} />)}
      </ScrollView>
      {!hideScore && <Text style={styles.score}>Score: {score}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', paddingVertical: 6, paddingHorizontal: 12 },
  activeContainer: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.08)' },
  label: { color: '#aaa', fontSize: 13, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  activeLabel: { color: '#FFD700' },
  cards: { flexDirection: 'row', paddingHorizontal: 8 },
  score: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 6 },
})
