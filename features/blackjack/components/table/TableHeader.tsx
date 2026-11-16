import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { sizedStyles, TableSize } from '../../../../lib/tableSize'
import { InfoButton } from '../../../../components/InfoSheet'
import { AssistInfo } from '../AssistInfo'

type Props = {
  size: TableSize
  rulePill: string
  assistEnabled: boolean
  onBack: () => void
  onToggleAssist: () => void
}

export function TableHeader({ size, rulePill, assistEnabled, onBack, onToggleAssist }: Props) {
  const s = SHEETS[size]
  const [infoOpen, setInfoOpen] = useState(false)
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={onBack}>
        <Text style={s.backArrow}>←</Text>
        <Text style={s.back}>Back</Text>
      </TouchableOpacity>
      <Text style={s.pill} numberOfLines={1}>{rulePill}</Text>
      <View style={s.assistGroup}>
        {/* Left of Assist, clear of its on/off dot. */}
        <InfoButton testID="assist-info-button" label="What Assist shows" onPress={() => setInfoOpen(true)} style={s.info} />
        <TouchableOpacity onPress={onToggleAssist}>
          <Text style={s.assist}>Assist: {assistEnabled ? '●' : '○'}</Text>
        </TouchableOpacity>
      </View>
      <AssistInfo visible={infoOpen} onClose={() => setInfoOpen(false)} />
    </View>
  )
}

const base = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, backgroundColor: '#0a4a24' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow: { color: '#fff', fontSize: 15, transform: [{ translateY: -1 }] },
  back: { color: '#fff', fontSize: 15 },
  pill: { color: '#FFD700', fontSize: 12, fontWeight: '600', flexShrink: 1, marginHorizontal: 8 },
  assist: { color: '#FFD700', fontSize: 15 },
  assistGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { color: '#FFD700', fontSize: 17 },
})

// Header and footer text grow 1.3x on large screens (the table pieces grow 1.5x).
const SHEETS = sizedStyles(base, {
  header: { padding: 16 },
  backBtn: { gap: 6 },
  backArrow: { fontSize: 20 },
  back: { fontSize: 20 },
  pill: { fontSize: 16 },
  assist: { fontSize: 20 },
  assistGroup: { gap: 14 },
  info: { fontSize: 22 },
})
