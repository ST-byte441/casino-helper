import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

type Props = {
  odds: number
  maxOdds: number
  onAdd(amount: number): void
  onRemove(amount: number): void
  increments: number[]
  quality?: 'optimal' | null
}

export function OddsRow({ odds, maxOdds, onAdd, onRemove, increments, quality }: Props) {
  const isOptimal = quality === 'optimal'
  return (
    <View style={[styles.row, isOptimal && styles.rowOptimal]}>
      <Text style={[styles.label, isOptimal && styles.labelOptimal]}>
        {'  '}Odds (max ${maxOdds})
      </Text>
      <View style={styles.right}>
        {odds > 0 && (
          <Text style={[styles.amount, isOptimal && styles.amountOptimal]}>${odds}</Text>
        )}
        <TouchableOpacity style={styles.btn} onPress={() => onRemove(increments[0])} disabled={odds === 0}>
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>
        {increments.map(inc => (
          <TouchableOpacity
            key={inc}
            style={[styles.btn, isOptimal && styles.btnOptimal]}
            onPress={() => onAdd(inc)}
            disabled={odds >= maxOdds}
          >
            <Text style={[styles.btnText, isOptimal && styles.btnTextOptimal]}>+${inc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1a1a2a', borderLeftWidth: 3, borderLeftColor: 'transparent' },
  rowOptimal: { borderLeftColor: '#2ecc71' },
  label: { color: '#aaa', fontSize: 14, flex: 1 },
  labelOptimal: { color: '#2ecc71' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amount: { color: '#FFD700', fontSize: 14, minWidth: 40, textAlign: 'right' },
  amountOptimal: { color: '#2ecc71' },
  btn: { backgroundColor: '#2a2a3e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  btnOptimal: { backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#2ecc71' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  btnTextOptimal: { color: '#2ecc71' },
})
