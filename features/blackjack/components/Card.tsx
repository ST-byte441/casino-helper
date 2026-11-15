import { useEffect, useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'
import { Text } from '../../../components/Text'
import { Card as CardType } from '../../../lib/types'
import { RED_SUITS } from '../../../lib/constants'
import { sizedStyles, TableSize } from '../../../lib/tableSize'

/** 'medium' (×1.3) is for landscape tables, where three large cards would not fit a hand's column. */
export type CardSize = TableSize | 'medium'

type Props = { card: CardType; size?: CardSize }

export const MEDIUM_CARD = { width: 68, height: 99, margin: 5 }

export function Card({ card, size = 'regular' }: Props) {
  const s = SHEETS[size]
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start()
  }, [])

  if (card.faceDown) {
    return (
      <Animated.View style={[s.card, s.faceDown, { opacity }]}>
        <Text style={s.back}>🂠</Text>
      </Animated.View>
    )
  }

  const isRed = RED_SUITS.includes(card.suit)
  return (
    <Animated.View style={[s.card, { opacity }]}>
      <Text style={[s.value, isRed && s.red]}>{card.value}</Text>
      <Text style={[s.suit, isRed && s.red]}>{card.suit}</Text>
    </Animated.View>
  )
}

const base = StyleSheet.create({
  card: { width: 52, height: 76, backgroundColor: '#fff', borderRadius: 6, margin: 4,
    justifyContent: 'center', alignItems: 'center', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  faceDown: { backgroundColor: '#1a3a5c' },
  value: { fontSize: 18, fontWeight: '700', color: '#111' },
  suit: { fontSize: 14, color: '#111' },
  red: { color: '#cc0000' },
  back: { fontSize: 36, color: '#fff' },
})

const SHEETS: Record<CardSize, typeof base> = {
  ...sizedStyles(base, {
    card: { width: 78, height: 114, margin: 6, borderRadius: 9 },
    value: { fontSize: 27 },
    suit: { fontSize: 21 },
    back: { fontSize: 54 },
  }),
  medium: sizedStyles(base, {
    card: { ...MEDIUM_CARD, borderRadius: 8 },
    value: { fontSize: 23 },
    suit: { fontSize: 18 },
    back: { fontSize: 47 },
  }).large,
}
