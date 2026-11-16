import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from '../Text'
import { CHIP_COLORS, stackChip } from './chips'

/** A round chip showing its amount, coloured by the largest chip the amount covers. */
export function ChipFace({ amount, size }: { amount: number; size: number }) {
  const c = CHIP_COLORS[stackChip(amount)]
  return (
    <View style={[styles.chip, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.fg }]} numberOfLines={1} adjustsFontSizeToFit>${amount}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderStyle: 'dashed', borderColor: '#FFD700' },
  chipText: { fontWeight: '800', fontSize: 13 },
})
