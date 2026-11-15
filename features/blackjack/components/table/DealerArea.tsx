import { View, StyleSheet } from 'react-native'
import { Card as CardType } from '../../../../lib/types'
import { Hand } from '../Hand'
import { sizedStyles, TableSize } from '../../sizes'

type Props = { size: TableSize; hand: CardType[]; hideScore: boolean }

/** The dealer's hand, always visible above the player's hands. */
export function DealerArea({ size, hand, hideScore }: Props) {
  const s = SHEETS[size]
  return (
    <View style={s.dealer}>
      <Hand hand={hand} label="Dealer" hideScore={hideScore} size={size} />
    </View>
  )
}

const base = StyleSheet.create({
  dealer: { paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
})

const SHEETS = sizedStyles(base, { dealer: { paddingVertical: 12 } })
