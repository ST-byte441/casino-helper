import React from 'react'
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { CHIP_SIZE } from './chips'
import { ChipFace } from './ChipFace'
import { ChipHandlers, DragHandle } from './DragHandle'

type Props = {
  chips: readonly number[]
  /** The chip selected for tap-to-place (each game keeps it in its own store). */
  selected: number | null
  onSelect(amount: number): void
  handlers: ChipHandlers
  size?: number
  /** 'row' (default) runs along the bottom; 'column' stacks the chips top to bottom at a side edge. */
  direction?: 'row' | 'column'
  style?: StyleProp<ViewStyle>
}

/** The row of chips: drag one onto the table, or tap one to select it (gold ring) for tap-to-place. */
export function ChipTray({ chips, selected, onSelect, handlers, size = CHIP_SIZE, direction = 'row', style }: Props) {
  return (
    <View style={[direction === 'row' ? styles.tray : styles.column, style]}>
      {chips.map(amount => (
        <DragHandle key={amount} testID={`chip-${amount}`} source={{ type: 'tray', amount }} {...handlers}
          onTap={() => onSelect(amount)} selected={selected === amount}
          style={[styles.trayChip, { borderRadius: size / 2 + 5 }, selected === amount && styles.trayChipSelected]}>
          <ChipFace amount={amount} size={size} />
        </DragHandle>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  tray: { flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 10, borderTopWidth: 1,
    borderColor: '#2a2a3e' },
  column: { flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 8,
    borderRightWidth: 1, borderColor: '#2a2a3e' },
  // The ring's border is always there (transparent when unselected) so selecting never shifts the tray, and the
  // negative margin cancels the ring's 5dp so the tray keeps its old height.
  trayChip: { padding: 2, margin: -5, borderWidth: 3, borderColor: 'transparent' },
  trayChipSelected: { borderColor: '#FFD700' },
})
