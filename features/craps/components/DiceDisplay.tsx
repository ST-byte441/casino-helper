import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
}

function Die({ value }: { value: number }) {
  const dots = DOT_POSITIONS[value] ?? []
  return (
    <View style={styles.die}>
      {Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 3 }, (_, col) => {
          const hasDot = dots.some(([r, c]) => r === row && c === col)
          return <View key={`${row}-${col}`} style={[styles.cell, hasDot && styles.dot]} />
        })
      )}
    </View>
  )
}

type Props = {
  dice: [number, number] | null
  point: number | null
}

export function DiceDisplay({ dice, point }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.diceRow}>
        {dice ? (
          <>
            <Die value={dice[0]} />
            <Text style={styles.plus}>+</Text>
            <Die value={dice[1]} />
            <Text style={styles.sum}>= {dice[0] + dice[1]}</Text>
          </>
        ) : (
          <Text style={styles.placeholder}>–  –</Text>
        )}
      </View>
      <View style={[styles.puck, point ? styles.puckOn : styles.puckOff]}>
        <Text style={[styles.puckText, point ? styles.puckTextOn : styles.puckTextOff]}>
          {point ? point.toString() : 'OFF'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  diceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  die: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 8, padding: 4, flexWrap: 'wrap', flexDirection: 'row' },
  cell: { width: '33.33%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { backgroundColor: '#13131f', borderRadius: 99, width: 8, height: 8, alignSelf: 'center' },
  plus: { color: '#aaa', fontSize: 18 },
  sum: { color: '#fff', fontSize: 22, fontWeight: '700', minWidth: 40 },
  placeholder: { color: '#555', fontSize: 28, letterSpacing: 8 },
  puck: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  puckOn: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#FFD700' },
  puckOff: { backgroundColor: '#333', borderWidth: 2, borderColor: '#555' },
  puckText: { fontWeight: '700', fontSize: 14 },
  puckTextOn: { color: '#13131f' },
  puckTextOff: { color: '#aaa' },
})
