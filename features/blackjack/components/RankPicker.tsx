import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Value } from '../../../lib/types'
import { VALUES } from '../../../lib/constants'

type Props = {
  onSelect: (value: Value) => void
  onClose: () => void
}

export function RankPicker({ onSelect, onClose }: Props) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <Text style={styles.heading}>Select Rank</Text>
          <View style={styles.grid}>
            {VALUES.map(value => (
              <TouchableOpacity
                key={value}
                style={styles.rankBtn}
                onPress={() => onSelect(value)}
              >
                <Text style={styles.rankText}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1e1e2e', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  heading: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  rankBtn: { width: 52, height: 52, backgroundColor: '#2a2a3e', borderRadius: 8,
    justifyContent: 'center', alignItems: 'center' },
  rankText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { backgroundColor: '#333', borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelText: { color: '#aaa', fontSize: 15, fontWeight: '600' },
})
