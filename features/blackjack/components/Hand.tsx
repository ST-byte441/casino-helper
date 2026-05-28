import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Card as CardType } from '../../../lib/types'
import { Card } from './Card'
import { scoreHand } from '../engine'

type Props = {
  hand: CardType[]
  label: string
  hideScore?: boolean
  active?: boolean
  status?: 'bust' | 'stood'
}

export function Hand({ hand, label, hideScore, active, status }: Props) {
  const score = hand.some(c => c.faceDown) ? '?' : scoreHand(hand)
  return (
    <View style={[styles.container, active && styles.activeContainer]}>
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
        {hand.map((card, i) => <Card key={i} card={card} />)}
      </ScrollView>
      {status === 'bust' && (
        <View style={[styles.badge, styles.bustBadge]}>
          <Text style={styles.badgeText}>Bust</Text>
        </View>
      )}
      {status === 'stood' && (
        <View style={[styles.badge, styles.stoodBadge]}>
          <Text style={styles.badgeText}>Stood</Text>
        </View>
      )}
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
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  bustBadge: { backgroundColor: '#c0392b' },
  stoodBadge: { backgroundColor: '#444' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  score: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 6 },
})
