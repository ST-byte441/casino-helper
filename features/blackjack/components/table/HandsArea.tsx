import { useEffect, useRef } from 'react'
import { View, ScrollView, StyleSheet, type ScrollViewInstance } from 'react-native'
import { Card as CardType } from '../../../../lib/types'
import { Hand } from '../Hand'
import { TableSize } from '../../sizes'

type Props = {
  size: TableSize
  /** Large screens: split hands sit side by side and wrap into rows. Phones: one hand per row. */
  wrap: boolean
  hands: CardType[][]
  activeHandIndex: number
  getHandStatus: (i: number) => 'bust' | 'stood' | undefined
}

/** The player's hands; scrolls to the active hand when it changes. */
export function HandsArea({ size, wrap, hands, activeHandIndex, getHandStatus }: Props) {
  const scrollRef = useRef<ScrollViewInstance>(null)
  const handOffsets = useRef<number[]>([])
  // A rotation remounts this area with no offsets measured yet, so the effect below scrolls to 0.
  // Scroll to the active hand once, as soon as its own layout arrives.
  const scrollOnFirstLayout = useRef(true)

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: handOffsets.current[activeHandIndex] ?? 0, animated: true })
  }, [activeHandIndex])

  const items = hands.map((hand, i) => (
    <View
      key={i}
      onLayout={e => {
        handOffsets.current[i] = e.nativeEvent.layout.y
        if (scrollOnFirstLayout.current && i === activeHandIndex) {
          scrollOnFirstLayout.current = false
          scrollRef.current?.scrollTo({ y: e.nativeEvent.layout.y, animated: false })
        }
      }}
    >
      <Hand
        hand={hand}
        label={hands.length > 1 ? `Hand ${i + 1}` : 'You'}
        active={hands.length > 1 && i === activeHandIndex}
        status={getHandStatus(i)}
        showSoftTotal
        size={size}
      />
    </View>
  ))

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.playerScroll}
      contentContainerStyle={wrap ? styles.playerContentWrap : styles.playerContent}
    >
      {wrap ? <View testID="bj-hands" style={styles.wrapRow}>{items}</View> : items}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  playerScroll: { flex: 1 },
  playerContent: { paddingVertical: 8 },
  playerContentWrap: { paddingVertical: 12, paddingHorizontal: 12 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 12 },
})
