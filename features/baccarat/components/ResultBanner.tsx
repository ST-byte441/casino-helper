import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { BaccaratOutcome } from '../../../lib/types'

type Props = {
  outcome: BaccaratOutcome
  netDelta: number
  onDismiss(): void
}

const OUTCOME_LABELS: Record<BaccaratOutcome, string> = {
  player: 'Player Wins',
  banker: 'Banker Wins',
  tie: 'Tie',
}

export function ResultBanner({ outcome, netDelta, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2000)
    return () => clearTimeout(t)
  }, [outcome])

  const sign = netDelta >= 0 ? '+' : '-'

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.card}>
        <Text style={styles.label}>{OUTCOME_LABELS[outcome]}</Text>
        <Text style={[styles.delta, netDelta >= 0 ? styles.positive : styles.negative]}>
          {sign}${Math.abs(netDelta)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: 'rgba(30,30,46,0.95)', borderRadius: 14, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  label: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  delta: { fontSize: 22, fontWeight: '700' },
  positive: { color: '#2ecc71' },
  negative: { color: '#e74c3c' },
})
