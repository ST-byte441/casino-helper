import React from 'react'
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native'
import { CrapsTableRules, CrapsVariant, OddsMultiple } from '../../../lib/types'

type Props = {
  rules: CrapsTableRules
  onConfirm(rules: CrapsTableRules): void
}

const VARIANTS: { value: CrapsVariant; label: string }[] = [
  { value: 'craps', label: 'Standard' },
  { value: 'crapless', label: 'Crapless' },
  { value: 'easy', label: 'Easy Craps' },
]

const ODDS: OddsMultiple[] = ['1x', '2x', '3-4-5x', '5x', '10x']

export function TableSetup({ rules, onConfirm }: Props) {
  const [local, setLocal] = React.useState<CrapsTableRules>(rules)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Table Setup</Text>

      <Text style={styles.label}>Variant</Text>
      <View style={styles.row}>
        {VARIANTS.map(v => (
          <TouchableOpacity
            key={v.value}
            style={[styles.chip, local.variant === v.value && styles.chipActive]}
            onPress={() => setLocal(s => ({ ...s, variant: v.value }))}
          >
            <Text style={[styles.chipText, local.variant === v.value && styles.chipTextActive]}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Odds</Text>
      <View style={styles.row}>
        {ODDS.map(o => (
          <TouchableOpacity
            key={o}
            style={[styles.chip, local.oddsMultiple === o && styles.chipActive]}
            onPress={() => setLocal(s => ({ ...s, oddsMultiple: o }))}
          >
            <Text style={[styles.chipText, local.oddsMultiple === o && styles.chipTextActive]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Field 12 pays 3:1</Text>
        <Switch
          value={local.fieldPays3on12}
          onValueChange={v => setLocal(s => ({ ...s, fieldPays3on12: v }))}
          trackColor={{ true: '#FFD700' }}
        />
      </View>

      <TouchableOpacity style={styles.btn} onPress={() => onConfirm(local)}>
        <Text style={styles.btnText}>Start Game</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#13131f', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  label: { color: '#aaa', fontSize: 13, marginBottom: 8, marginTop: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2a2a3e' },
  chipActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  chipText: { color: '#aaa', fontSize: 14 },
  chipTextActive: { color: '#13131f', fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  switchLabel: { color: '#fff', fontSize: 16 },
  btn: { backgroundColor: '#FFD700', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 32 },
  btnText: { fontWeight: '700', fontSize: 16 },
})
