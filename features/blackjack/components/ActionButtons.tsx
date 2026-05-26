import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Action } from '../../../lib/types'

type Props = {
  suggestedAction: Action | null
  canDouble: boolean
  canSplit: boolean
  canSurrender: boolean
  onHit: () => void
  onStand: () => void
  onDouble: () => void
  onSplit: () => void
  onSurrender: () => void
}

const ACTIONS: { key: Action; label: string }[] = [
  { key: 'hit', label: 'Hit' },
  { key: 'stand', label: 'Stand' },
  { key: 'double', label: 'Double' },
  { key: 'split', label: 'Split' },
  { key: 'surrender', label: 'Surrender' },
]

export function ActionButtons({
  suggestedAction, canDouble, canSplit, canSurrender,
  onHit, onStand, onDouble, onSplit, onSurrender,
}: Props) {
  const handlers: Record<Action, () => void> = {
    hit: onHit, stand: onStand, double: onDouble, split: onSplit, surrender: onSurrender,
  }
  const enabled: Record<Action, boolean> = {
    hit: true, stand: true, double: canDouble, split: canSplit, surrender: canSurrender,
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {ACTIONS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.btn, !enabled[key] && styles.btnDisabled, suggestedAction === key && styles.btnSuggested]}
            disabled={!enabled[key]}
            onPress={handlers[key]}
          >
            <Text style={[styles.btnText, !enabled[key] && styles.btnTextDisabled]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  btn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#2a2a3e',
    borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  btnSuggested: { borderColor: '#FFD700' },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnTextDisabled: { color: '#666' },
})
