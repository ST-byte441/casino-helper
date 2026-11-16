import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { HowToPlayButton } from '../../../components/InfoSheet'
import { HowToPlay } from './HowToPlay'
import { Text } from '../../../components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RouletteSettings, RouletteSpeed, RouletteWheel } from '../../../lib/types'

type Props = { initial: RouletteSettings; onStart(s: RouletteSettings): void }

type RowProps<T extends string> = {
  label: string
  note: string
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}

const WHEEL_NOTES: Record<RouletteWheel, string> = {
  single: '0 · 2.70% house edge',
  double: '0, 00 · 5.26% house edge',
  triple: '0, 00, 000 · 7.69% house edge',
}

function RuleRow<T extends string>({ label, note, options, value, onChange }: RowProps<T>) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleInfo}>
        <Text style={styles.ruleLabel}>{label}</Text>
        <Text style={styles.ruleNote}>{note}</Text>
      </View>
      <View style={styles.segments}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, value === opt.value && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.segmentText, value === opt.value && styles.segmentTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export function RouletteSetup({ initial, onStart }: Props) {
  const [howOpen, setHowOpen] = useState(false)
  const [settings, setSettings] = useState<RouletteSettings>(initial)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>Roulette Table</Text>
        <HowToPlayButton onPress={() => setHowOpen(true)} />
      </View>
      <HowToPlay visible={howOpen} onClose={() => setHowOpen(false)} />
      <View style={styles.body}>
        <RuleRow<RouletteWheel>
          label="Wheel" note={WHEEL_NOTES[settings.wheel]}
          options={[
            { label: 'Single zero', value: 'single' },
            { label: 'Double zero', value: 'double' },
            { label: 'Triple zero', value: 'triple' },
          ]}
          value={settings.wheel} onChange={wheel => setSettings(s => ({ ...s, wheel }))}
        />
        <RuleRow<RouletteSpeed>
          label="Spin" note="Fast plays the same spin in 1.5s"
          options={[{ label: 'Slow', value: 'slow' }, { label: 'Fast', value: 'fast' }]}
          value={settings.speed} onChange={speed => setSettings(s => ({ ...s, speed }))}
        />
      </View>
      <TouchableOpacity style={styles.playBtn} onPress={() => onStart(settings)}>
        <Text style={styles.playBtnText}>Play</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', padding: 16, flexShrink: 1 },
  body: { flex: 1, paddingHorizontal: 16 },
  ruleRow: { marginBottom: 20 },
  ruleInfo: { marginBottom: 8 },
  ruleLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ruleNote: { color: '#aaa', fontSize: 12, marginTop: 2 },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2a2a3e', alignItems: 'center' },
  segmentActive: { backgroundColor: '#FFD700' },
  segmentText: { color: '#aaa', fontWeight: '600' },
  segmentTextActive: { color: '#000' },
  playBtn: { backgroundColor: '#FFD700', margin: 16, padding: 16, borderRadius: 10, alignItems: 'center' },
  playBtnText: { fontWeight: '700', fontSize: 18 },
})
