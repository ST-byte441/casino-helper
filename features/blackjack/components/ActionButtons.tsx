import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '../../../components/Text'
import { Action } from '../../../lib/types'
import { sizedStyles, TableSize } from '../../../lib/tableSize'

type Props = {
  suggestedAction: Action | null
  /** False on a hand that can't take a card (a split ace); default true. */
  canHit?: boolean
  canDouble: boolean
  canSplit: boolean
  canSurrender: boolean
  onHit: () => void
  onStand: () => void
  onDouble: () => void
  onSplit: () => void
  onSurrender: () => void
  size?: TableSize
  /** 'column': one full-width button per row (the large-landscape side panel). */
  direction?: 'row' | 'column'
}

const ACTIONS: { key: Action; label: string }[] = [
  { key: 'hit', label: 'Hit' },
  { key: 'stand', label: 'Stand' },
  { key: 'double', label: 'Double' },
  { key: 'split', label: 'Split' },
  { key: 'surrender', label: 'Surrender' },
]

export function ActionButtons({
  suggestedAction, canHit = true, canDouble, canSplit, canSurrender,
  onHit, onStand, onDouble, onSplit, onSurrender, size = 'regular', direction = 'row',
}: Props) {
  const s = SHEETS[size]
  const handlers: Record<Action, () => void> = {
    hit: onHit, stand: onStand, double: onDouble, split: onSplit, surrender: onSurrender,
  }
  const enabled: Record<Action, boolean> = {
    hit: canHit, stand: true, double: canDouble, split: canSplit, surrender: canSurrender,
  }

  return (
    <View style={s.container}>
      <View style={direction === 'column' ? [s.row, columnStyles.row] : s.row}>
        {ACTIONS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[s.btn, ...(direction === 'column' ? [columnStyles.btn] : []), !enabled[key] && s.btnDisabled, suggestedAction === key && s.btnSuggested]}
            disabled={!enabled[key]}
            onPress={handlers[key]}
          >
            <Text style={[s.btnText, !enabled[key] && s.btnTextDisabled]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const base = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  btn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#2a2a3e',
    borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  btnSuggested: { borderColor: '#FFD700' },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnTextDisabled: { color: '#666' },
})

const SHEETS = sizedStyles(base, {
  row: { gap: 12 },
  btn: { paddingVertical: 18, paddingHorizontal: 30 },
  btnText: { fontSize: 22 },
})

// Column mode only exists on large landscape, so it never touches phone output.
const columnStyles = StyleSheet.create({
  row: { flexDirection: 'column', flexWrap: 'nowrap' },
  btn: { alignSelf: 'stretch', alignItems: 'center' },
})
