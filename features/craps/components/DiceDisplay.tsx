import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

const DIE_SIZE = 52
const DOT = 9

// [xPct, yPct] — dot centre as fraction of die size, matching real die layouts
const FACES: Record<number, Array<[number, number]>> = {
  1: [[0.50, 0.50]],
  2: [[0.75, 0.25], [0.25, 0.75]],
  3: [[0.75, 0.25], [0.50, 0.50], [0.25, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.50, 0.50], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.50], [0.75, 0.50], [0.25, 0.75], [0.75, 0.75]],
}

function Die({ value }: { value: number }) {
  return (
    <View style={styles.die}>
      {(FACES[value] ?? []).map(([xPct, yPct], i) => (
        <View
          key={i}
          style={[styles.dot, {
            left: xPct * DIE_SIZE - DOT / 2,
            top: yPct * DIE_SIZE - DOT / 2,
          }]}
        />
      ))}
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
  die: { width: DIE_SIZE, height: DIE_SIZE, backgroundColor: '#fff', borderRadius: 8, position: 'relative' },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT, backgroundColor: '#13131f' },
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
