import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { BaccaratBet, BetQuality } from '../../../lib/types'
import { BACCARAT_CHIPS } from '../../../lib/constants'
import { getBaccaratBetQuality } from '../strategy'

type Props = {
  bets: Partial<Record<BaccaratBet, number>>
  assistEnabled: boolean
  disabled?: boolean
  chip: number // amount a tap on Player/Banker adds
  onChipChange(chip: number): void
  onAdd(bet: BaccaratBet, amount: number): void
  onClear(): void
}

const TIE_INCREMENT = 5
const PAIR_INCREMENT = 1

// increment: null means "use the selected chip"
const BET_CONFIG: { bet: BaccaratBet; label: string; increment: number | null }[] = [
  { bet: 'player', label: 'Player', increment: null },
  { bet: 'banker', label: 'Banker', increment: null },
  { bet: 'tie', label: 'Tie\n8:1', increment: TIE_INCREMENT },
  { bet: 'player-pair', label: 'P.Pair\n11:1', increment: PAIR_INCREMENT },
  { bet: 'banker-pair', label: 'B.Pair\n11:1', increment: PAIR_INCREMENT },
]

const QUALITY_COLORS: Record<BetQuality, string> = {
  optimal: '#FFD700',
  acceptable: '#fff',
  poor: '#FFA500',
  avoid: '#e74c3c',
}

export function BetPanel({ bets, assistEnabled, disabled, chip, onChipChange, onAdd, onClear }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {BACCARAT_CHIPS.map(value => (
          <TouchableOpacity
            key={value}
            style={[styles.chip, value === chip && styles.chipSelected]}
            onPress={() => onChipChange(value)}
            disabled={disabled}
          >
            <Text style={[styles.chipText, value === chip && styles.chipTextSelected]}>${value}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        {BET_CONFIG.map(({ bet, label, increment }) => {
          const amount = bets[bet] ?? 0
          const quality = assistEnabled ? getBaccaratBetQuality(bet) : null
          const borderColor = quality ? QUALITY_COLORS[quality] : '#2a2a3e'
          return (
            <TouchableOpacity
              key={bet}
              style={[styles.btn, { borderColor }]}
              onPress={() => !disabled && onAdd(bet, increment ?? chip)}
              disabled={disabled}
            >
              <Text style={styles.label}>{label}</Text>
              {amount > 0 && <Text style={styles.amount}>${amount}</Text>}
            </TouchableOpacity>
          )
        })}
      </View>
      {Object.values(bets).some(v => v && v > 0) && !disabled && (
        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
          <Text style={styles.clearText}>Clear Bets</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 8 },
  chips: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 8 },
  chip: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#2a2a3e',
    backgroundColor: '#1e1e2e', alignItems: 'center', justifyContent: 'center' },
  chipSelected: { borderColor: '#FFD700', backgroundColor: '#2a2a3e' },
  chipText: { color: '#aaa', fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: '#FFD700' },
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  btn: { flex: 1, backgroundColor: '#1e1e2e', borderRadius: 10, borderWidth: 2,
    paddingVertical: 10, alignItems: 'center', minHeight: 64, justifyContent: 'center' },
  label: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  amount: { color: '#FFD700', fontSize: 13, fontWeight: '700', marginTop: 4 },
  clearBtn: { marginTop: 8, alignItems: 'center', padding: 8 },
  clearText: { color: '#aaa', fontSize: 13 },
})
