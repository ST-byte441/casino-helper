import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { BetQuality } from '../../../lib/types'

type Props = {
  title: string
  totalWagered: number
  defaultExpanded?: boolean
  quality?: BetQuality | null
  winDelta?: number
  children: React.ReactNode
}

const QUALITY_COLORS: Record<BetQuality, string> = {
  optimal: '#FFD700',
  acceptable: '#fff',
  poor: '#FFA500',
  avoid: '#e74c3c',
}

export function BetCategoryPanel({ title, totalWagered, defaultExpanded, quality, winDelta, children }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const borderColor = quality ? QUALITY_COLORS[quality] : 'transparent'

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.header, { borderLeftColor: borderColor }]} onPress={() => setExpanded(e => !e)}>
        <Text style={styles.arrow}>{expanded ? '▼' : '▶'}</Text>
        <Text style={styles.title}>{title}</Text>
        {totalWagered > 0 && <Text style={styles.total}>${totalWagered}</Text>}
        {winDelta != null && winDelta > 0 && <Text style={styles.winDelta}>+${winDelta}</Text>}
      </TouchableOpacity>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 2 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1e1e2e', borderLeftWidth: 3 },
  arrow: { color: '#aaa', fontSize: 12, marginRight: 8 },
  title: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  total: { color: '#FFD700', fontSize: 14 },
  winDelta: { color: '#2ecc71', fontSize: 13, fontWeight: '700', marginLeft: 8 },
  body: { backgroundColor: '#17172a' },
})
