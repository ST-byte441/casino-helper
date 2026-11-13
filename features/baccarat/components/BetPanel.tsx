import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { BaccaratBet, BetQuality } from '../../../lib/types'
import { BACCARAT_CHIPS, BACCARAT_SIDE_CHIPS } from '../../../lib/constants'
import { getBaccaratBetQuality } from '../strategy'

type Props = {
  bets: Partial<Record<BaccaratBet, number>>
  assistEnabled: boolean
  disabled?: boolean
  mainChip: number // amount a tap on Player/Banker adds
  sideChip: number // amount a tap on Tie or a pair adds
  onMainChipChange(chip: number): void
  onSideChipChange(chip: number): void
  onAdd(bet: BaccaratBet, amount: number): void
  onClear(): void
}

const MAIN_BETS: { bet: BaccaratBet; label: string }[] = [
  { bet: 'player', label: 'Player' },
  { bet: 'banker', label: 'Banker' },
]
const SIDE_BETS: { bet: BaccaratBet; label: string }[] = [
  { bet: 'tie', label: 'Tie\n8:1' },
  { bet: 'player-pair', label: 'P.Pair\n11:1' },
  { bet: 'banker-pair', label: 'B.Pair\n11:1' },
]

const SIDE_COLOR = '#9b7bd4'

const QUALITY_COLORS: Record<BetQuality, string> = {
  optimal: '#FFD700',
  acceptable: '#fff',
  poor: '#FFA500',
  avoid: '#e74c3c',
}

type ChipRowProps = {
  label: string
  values: readonly number[]
  selected: number
  idPrefix: string
  accent: string
  disabled?: boolean
  onSelect(value: number): void
}

function ChipRow({ label, values, selected, idPrefix, accent, disabled, onSelect }: ChipRowProps) {
  return (
    <View style={styles.chipRow}>
      <Text style={[styles.chipRowLabel, { color: accent }]}>{label}</Text>
      {values.map(value => {
        const isSelected = value === selected
        return (
          <TouchableOpacity
            key={value}
            testID={`${idPrefix}-${value}`}
            style={[styles.chip, isSelected && { borderColor: accent, backgroundColor: '#2a2a3e' }]}
            onPress={() => onSelect(value)}
            disabled={disabled}
          >
            <Text style={[styles.chipText, isSelected && { color: accent }]}>${value}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export function BetPanel({
  bets, assistEnabled, disabled, mainChip, sideChip, onMainChipChange, onSideChipChange, onAdd, onClear,
}: Props) {
  function betButton({ bet, label }: { bet: BaccaratBet; label: string }, isSide: boolean) {
    const amount = bets[bet] ?? 0
    const quality = assistEnabled ? getBaccaratBetQuality(bet) : null
    const borderColor = quality ? QUALITY_COLORS[quality] : isSide ? SIDE_COLOR : '#2a2a3e'
    return (
      <TouchableOpacity
        key={bet}
        testID={`bet-${bet}`}
        style={[styles.btn, isSide && styles.sideBtn, { borderColor }]}
        onPress={() => !disabled && onAdd(bet, isSide ? sideChip : mainChip)}
        disabled={disabled}
      >
        <Text style={styles.label}>{label}</Text>
        {amount > 0 && <Text style={[styles.amount, isSide && { color: SIDE_COLOR }]}>${amount}</Text>}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <ChipRow label="MAIN" values={BACCARAT_CHIPS} selected={mainChip} idPrefix="main-chip"
        accent="#FFD700" disabled={disabled} onSelect={onMainChipChange} />
      <View style={styles.row}>{MAIN_BETS.map(b => betButton(b, false))}</View>

      <ChipRow label="SIDE" values={BACCARAT_SIDE_CHIPS} selected={sideChip} idPrefix="side-chip"
        accent={SIDE_COLOR} disabled={disabled} onSelect={onSideChipChange} />
      <View style={styles.row}>{SIDE_BETS.map(b => betButton(b, true))}</View>

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
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginVertical: 6 },
  chipRowLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, width: 36 },
  chip: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#2a2a3e',
    backgroundColor: '#1e1e2e', alignItems: 'center', justifyContent: 'center' },
  chipText: { color: '#aaa', fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  btn: { flex: 1, backgroundColor: '#1e1e2e', borderRadius: 10, borderWidth: 2,
    paddingVertical: 10, alignItems: 'center', minHeight: 56, justifyContent: 'center' },
  sideBtn: { borderStyle: 'dashed' },
  label: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  amount: { color: '#FFD700', fontSize: 13, fontWeight: '700', marginTop: 4 },
  clearBtn: { marginTop: 8, alignItems: 'center', padding: 8 },
  clearText: { color: '#aaa', fontSize: 13 },
})
