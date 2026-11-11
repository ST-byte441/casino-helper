import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { BaccaratOutcome } from '../../../lib/types'

type Props = {
  outcome: BaccaratOutcome
  playerScore: number
  bankerScore: number
  netDelta: number
}

function headline(outcome: BaccaratOutcome, p: number, b: number): string {
  if (outcome === 'player') return `Player Wins ${p} to ${b}`
  if (outcome === 'banker') return `Banker Wins ${b} to ${p}`
  return `Tie ${p} to ${b}`
}

export function ResultBanner({ outcome, playerScore, bankerScore, netDelta }: Props) {
  const sign = netDelta >= 0 ? '+' : '-'
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{headline(outcome, playerScore, bankerScore)}</Text>
      <Text style={[styles.delta, netDelta >= 0 ? styles.positive : styles.negative]}>
        {sign}${Math.abs(netDelta)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(30,30,46,0.95)', borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 20, marginHorizontal: 24, marginVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#FFD700' },
  label: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  delta: { fontSize: 18, fontWeight: '700' },
  positive: { color: '#2ecc71' },
  negative: { color: '#e74c3c' },
})
