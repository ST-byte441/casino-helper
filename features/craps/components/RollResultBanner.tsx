import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { RollResolution } from '../../../lib/types'

type Props = {
  resolution: RollResolution | null
  delta: number
  onDismiss(): void
}

const PHASE_LABELS: Record<string, string> = {
  natural: 'Natural!',
  craps: 'Craps',
  'point-set': 'Point Set',
  'point-made': 'Point Made!',
  'seven-out': 'Seven Out',
}

export function RollResultBanner({ resolution, delta, onDismiss }: Props) {
  useEffect(() => {
    if (!resolution) return
    const t = setTimeout(onDismiss, 1500)
    return () => clearTimeout(t)
  }, [resolution])

  if (!resolution?.phaseChange) return null

  const label = PHASE_LABELS[resolution.phaseChange] ?? ''
  const sign = delta >= 0 ? '+' : ''

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.card}>
        <Text style={styles.event}>{label}</Text>
        <Text style={[styles.delta, delta >= 0 ? styles.positive : styles.negative]}>
          {sign}${delta}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: 'rgba(30,30,46,0.95)', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  event: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  delta: { fontSize: 20, fontWeight: '700' },
  positive: { color: '#2ecc71' },
  negative: { color: '#e74c3c' },
})
