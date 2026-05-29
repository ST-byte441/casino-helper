import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { BetQuality } from '../../../lib/types'
import { WorkingToggle } from './WorkingToggle'

type Props = {
  label: string
  amount: number
  increment: number
  increments?: number[]
  disabled?: boolean
  showWorking?: boolean
  working?: boolean
  quality?: BetQuality | null
  winDelta?: number
  onAdd(amount?: number): void
  onRemove(): void
  onToggleWorking?(): void
}

const QUALITY_COLORS: Record<BetQuality, string> = {
  optimal: '#FFD700',
  acceptable: '#fff',
  poor: '#FFA500',
  avoid: '#e74c3c',
}

export function BetRow({ label, amount, increment, increments, disabled, showWorking, working, quality, winDelta, onAdd, onRemove, onToggleWorking }: Props) {
  const borderColor = quality ? QUALITY_COLORS[quality] : 'transparent'
  const addAmounts = increments ?? [increment]
  return (
    <View style={[styles.row, { borderLeftColor: borderColor }]}>
      <Text style={[styles.label, disabled && styles.dimmed, amount > 0 && styles.labelActive]}>{label}</Text>
      <View style={styles.right}>
        {amount > 0 && <Text style={styles.amount}>${amount}</Text>}
        {winDelta != null && winDelta > 0 && (
          <Text style={styles.winBadge}>+${winDelta}</Text>
        )}
        {showWorking && working != null && onToggleWorking && (
          <WorkingToggle working={working} onToggle={onToggleWorking} />
        )}
        <TouchableOpacity style={[styles.btn, disabled && styles.btnDisabled]} onPress={onRemove} disabled={disabled || amount === 0}>
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>
        {addAmounts.map(inc => (
          <TouchableOpacity key={inc} style={[styles.btn, disabled && styles.btnDisabled]} onPress={() => onAdd(inc)} disabled={!!disabled}>
            <Text style={styles.btnText}>+${inc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 3 },
  label: { color: '#fff', fontSize: 15, flex: 1 },
  labelActive: { color: '#FFD700', fontWeight: '600' },
  dimmed: { color: '#555' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { color: '#FFD700', fontSize: 14, minWidth: 40, textAlign: 'right' },
  winBadge: { color: '#2ecc71', fontSize: 12, fontWeight: '700' },
  btn: { backgroundColor: '#2a2a3e', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
})
