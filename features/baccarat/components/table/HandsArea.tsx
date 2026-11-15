import { View, StyleSheet } from 'react-native'
import { Card as CardType } from '../../../../lib/types'
import { TableSize } from '../../../../lib/tableSize'
import { CardSize } from '../../../blackjack/components/Card'
import { HandDisplay } from '../HandDisplay'

type HandProps = { hand: CardType[]; shown?: number; faceUp?: number; highlight: boolean }

type Props = {
  size: TableSize
  cardSize?: CardSize
  /** 'stack': Banker above Player (phones, large portrait). 'sideBySide': Banker | Player (large landscape). */
  arrangement: 'stack' | 'sideBySide'
  banker: HandProps
  player: HandProps
}

/** Side padding of each hand column in the side-by-side arrangement. */
export const HAND_COLUMN_PADDING = 4

export function HandsArea({ size, cardSize, arrangement, banker, player }: Props) {
  const bankerHand = <HandDisplay {...banker} label="Banker" size={size} cardSize={cardSize} />
  const playerHand = <HandDisplay {...player} label="Player" size={size} cardSize={cardSize} />
  if (arrangement === 'stack') {
    return (
      <>
        {bankerHand}
        <View style={styles.divider} />
        {playerHand}
      </>
    )
  }
  return (
    <View testID="bac-hands-row" style={styles.row}>
      <View style={styles.column}>{bankerHand}</View>
      <View style={styles.vDivider} />
      <View style={styles.column}>{playerHand}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  divider: { height: 1, backgroundColor: '#2a2a3e', marginHorizontal: 32, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  column: { flex: 1, paddingHorizontal: HAND_COLUMN_PADDING },
  vDivider: { width: 1, backgroundColor: '#2a2a3e', marginVertical: 16 },
})
