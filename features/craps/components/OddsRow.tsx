import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

type Props = {
  odds: number
  maxOdds: number
  onAdd(amount: number): void
  onRemove(amount: number): void
  increment: number
}

export function OddsRow({ odds, maxOdds, onAdd, onRemove, increment }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>  Odds (max ${maxOdds})</Text>
      <View style={styles.right}>
        {odds > 0 && <Text style={styles.amount}>${odds}</Text>}
        <TouchableOpacity style={styles.btn} onPress={() => onRemove(increment)} disabled={odds === 0}>
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => onAdd(increment)} disabled={odds >= maxOdds}>
          <Text style={styles.btnText}>+${increment}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#1a1a2a' },
  label: { color: '#aaa', fontSize: 14, flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { color: '#FFD700', fontSize: 14, minWidth: 40, textAlign: 'right' },
  btn: { backgroundColor: '#2a2a3e', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
})
