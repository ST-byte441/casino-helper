import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Pocket } from '../../../lib/types'
import { pocketColor, pocketLabel } from '../engine'
import { POCKET_BG } from './Board'

type Props = { result: Pocket; net: number; onBack(): void }

export function netLabel(net: number): string {
  if (net > 0) return `+$${net}`
  if (net < 0) return `-$${-net}`
  return 'Even'
}

export function ResultPanel({ result, net, onBack }: Props) {
  return (
    <View style={styles.panel}>
      <View style={[styles.pocket, { backgroundColor: POCKET_BG[pocketColor(result)] }]}>
        <Text style={styles.pocketText}>{pocketLabel(result)}</Text>
      </View>
      <Text style={[styles.net, net > 0 ? styles.win : net < 0 ? styles.loss : styles.even]}>{netLabel(net)}</Text>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>Back to table</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', padding: 16, backgroundColor: '#13131f', borderTopWidth: 1, borderColor: '#2a2a3e' },
  pocket: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff' },
  pocketText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  net: { fontSize: 24, fontWeight: '700', marginTop: 10 },
  win: { color: '#FFD700' },
  loss: { color: '#ff6b6b' },
  even: { color: '#aaa' },
  backBtn: { backgroundColor: '#FFD700', marginTop: 14, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
  backText: { fontWeight: '700', fontSize: 16, color: '#000' },
})
