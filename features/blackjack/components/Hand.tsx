import { View, ScrollView, StyleSheet } from 'react-native'
import { Text } from '../../../components/Text'
import { Card as CardType } from '../../../lib/types'
import { Card } from './Card'
import { formatHandTotal, scoreHand } from '../engine'
import { sizedStyles, TableSize } from '../sizes'

type Props = {
  hand: CardType[]
  label: string
  hideScore?: boolean
  active?: boolean
  status?: 'bust' | 'stood'
  /** Show soft hands as both totals, e.g. "7/17" */
  showSoftTotal?: boolean
  size?: TableSize
}

export function Hand({ hand, label, hideScore, active, status, showSoftTotal, size = 'regular' }: Props) {
  const s = SHEETS[size]
  const score = hand.some(c => c.faceDown) ? '?' : showSoftTotal ? formatHandTotal(hand) : scoreHand(hand)
  return (
    <View style={[s.container, active && s.activeContainer]}>
      <Text style={[s.label, active && s.activeLabel]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cards}>
        {hand.map((card, i) => <Card key={i} card={card} size={size} />)}
      </ScrollView>
      {status === 'bust' && (
        <View style={[s.badge, s.bustBadge]}>
          <Text style={s.badgeText}>Bust</Text>
        </View>
      )}
      {status === 'stood' && (
        <View style={[s.badge, s.stoodBadge]}>
          <Text style={s.badgeText}>Stood</Text>
        </View>
      )}
      {!hideScore && <Text style={s.score}>Score: {score}</Text>}
    </View>
  )
}

const base = StyleSheet.create({
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

const SHEETS = sizedStyles(base, {
  container: { paddingVertical: 9, paddingHorizontal: 18, marginVertical: 12 },
  label: { fontSize: 18 },
  badgeText: { fontSize: 15 },
  score: { fontSize: 22 },
})
