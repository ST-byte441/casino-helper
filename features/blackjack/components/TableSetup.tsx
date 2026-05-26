import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TableRules, PayoutMode, SoftSeven, SurrenderMode, DeckCount } from '../../../lib/types'
import { DEFAULT_TABLE_RULES } from '../../../lib/constants'

type Props = { onStart: (rules: TableRules) => void }

type SegmentedProps<T extends string | number | boolean> = {
  label: string
  note: string
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}

function RuleRow<T extends string | number | boolean>({ label, note, options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleInfo}>
        <Text style={styles.ruleLabel}>{label}</Text>
        <Text style={styles.ruleNote}>{note}</Text>
      </View>
      <View style={styles.segments}>
        {options.map(opt => (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.segment, value === opt.value && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.segmentText, value === opt.value && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export function TableSetup({ onStart }: Props) {
  const [rules, setRules] = useState<TableRules>(DEFAULT_TABLE_RULES)
  const set = <K extends keyof TableRules>(key: K, val: TableRules[K]) =>
    setRules(r => ({ ...r, [key]: val }))

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Table Rules</Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        <RuleRow<PayoutMode>
          label="Blackjack Pays" note="6:5 adds +1.39% house edge"
          options={[{ label: '3:2', value: '3:2' }, { label: '6:5', value: '6:5' }]}
          value={rules.payoutMode} onChange={v => set('payoutMode', v)}
        />
        <RuleRow<SoftSeven>
          label="Dealer Soft 17" note="H17 adds +0.22% house edge"
          options={[{ label: 'Hit (H17)', value: 'H17' }, { label: 'Stand (S17)', value: 'S17' }]}
          value={rules.dealerSoft17} onChange={v => set('dealerSoft17', v)}
        />
        <RuleRow<boolean>
          label="Double After Split" note="Off adds +0.14% house edge"
          options={[{ label: 'On', value: true }, { label: 'Off', value: false }]}
          value={rules.doubleAfterSplit} onChange={v => set('doubleAfterSplit', v)}
        />
        <RuleRow<boolean>
          label="Re-split Aces" note="On removes −0.08% house edge"
          options={[{ label: 'On', value: true }, { label: 'Off', value: false }]}
          value={rules.resplitAces} onChange={v => set('resplitAces', v)}
        />
        <RuleRow<SurrenderMode>
          label="Surrender" note="Late surrender removes −0.08%"
          options={[{ label: 'None', value: 'none' }, { label: 'Late', value: 'late' }, { label: 'Early', value: 'early' }]}
          value={rules.surrender} onChange={v => set('surrender', v)}
        />
        <RuleRow<DeckCount>
          label="Number of Decks" note="Fewer decks favor the player"
          options={[{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '6', value: 6 }, { label: '8', value: 8 }]}
          value={rules.deckCount} onChange={v => set('deckCount', v)}
        />
      </ScrollView>
      <TouchableOpacity style={styles.playBtn} onPress={() => onStart(rules)}>
        <Text style={styles.playBtnText}>Play</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', padding: 16 },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  ruleRow: { marginBottom: 20 },
  ruleInfo: { marginBottom: 8 },
  ruleLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ruleNote: { color: '#888', fontSize: 12, marginTop: 2 },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2a2a3e', alignItems: 'center' },
  segmentActive: { backgroundColor: '#FFD700' },
  segmentText: { color: '#aaa', fontWeight: '600' },
  segmentTextActive: { color: '#000' },
  playBtn: { backgroundColor: '#FFD700', margin: 16, padding: 16, borderRadius: 10, alignItems: 'center' },
  playBtnText: { fontWeight: '700', fontSize: 18 },
})
