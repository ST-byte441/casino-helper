import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { BackButton } from '../../../../components/BackButton'
import { InfoButton } from '../../../../components/InfoSheet'
import { HowToPlay } from '../HowToPlay'
import { sizedStyles, TableSize } from '../../../../lib/tableSize'

type Props = {
  size: TableSize
  squeezeOn: boolean
  /** The Squeeze toggle is locked while a hand is being revealed. */
  locked: boolean
  onBack(): void
  onToggleSqueeze(): void
}

export function TableHeader({ size, squeezeOn, locked, onBack, onToggleSqueeze }: Props) {
  const s = SHEETS[size]
  const [howOpen, setHowOpen] = useState(false)
  return (
    <View style={s.header}>
      <BackButton onPress={onBack} style={s.back} />
      <Text style={s.title} numberOfLines={1}>BACCARAT</Text>
      <View style={s.toggleGroup}>
        {/* Left of Squeeze, clear of its on/off dot. */}
        <InfoButton testID="how-to-play-info" label="How to play" onPress={() => setHowOpen(true)} style={s.info} />
        <TouchableOpacity disabled={locked} style={locked && s.toggleDisabled} onPress={onToggleSqueeze}>
          <Text style={[s.toggle, squeezeOn && s.toggleOn]}>
            Squeeze {squeezeOn ? '●' : '○'}
          </Text>
        </TouchableOpacity>
      </View>
      <HowToPlay visible={howOpen} onClose={() => setHowOpen(false)} />
    </View>
  )
}

const base = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  back: { color: '#aaa', fontSize: 15 },
  title: { color: '#FFD700', fontWeight: '700', fontSize: 15, flexShrink: 1, marginHorizontal: 8 },
  toggle: { color: '#aaa', fontSize: 13 },
  toggleOn: { color: '#FFD700' },
  toggleDisabled: { opacity: 0.4 },
  toggleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { color: '#aaa', fontSize: 16 },
})

const SHEETS = sizedStyles(base, {
  header: { padding: 18 },
  back: { fontSize: 20 },
  title: { fontSize: 20 },
  toggle: { fontSize: 17 },
  toggleGroup: { gap: 14 },
  info: { fontSize: 21 },
})
