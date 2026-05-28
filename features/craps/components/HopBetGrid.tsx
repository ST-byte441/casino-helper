import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'

type Props = {
  onPlace(hopDice: [number, number], isHard: boolean, amount: number): void
  increment: number
}

function genHops(): Array<{ dice: [number, number]; hard: boolean }> {
  const hops: Array<{ dice: [number, number]; hard: boolean }> = []
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = d1; d2 <= 6; d2++) {
      hops.push({ dice: [d1, d2], hard: d1 === d2 })
    }
  }
  return hops
}

const HOPS = genHops()

export function HopBetGrid({ onPlace, increment }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grid}>
      {HOPS.map(({ dice, hard }) => (
        <TouchableOpacity
          key={`${dice[0]}-${dice[1]}`}
          style={[styles.cell, hard && styles.hardCell]}
          onPress={() => onPlace(dice, hard, increment)}
        >
          <Text style={styles.label}>{dice[0]}-{dice[1]}</Text>
          <Text style={styles.payout}>{hard ? '30:1' : '15:1'}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 6, width: 320 },
  cell: { width: 56, height: 48, backgroundColor: '#2a2a3e', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  hardCell: { borderWidth: 1, borderColor: '#FFD700' },
  label: { color: '#fff', fontSize: 13, fontWeight: '600' },
  payout: { color: '#aaa', fontSize: 10 },
})
