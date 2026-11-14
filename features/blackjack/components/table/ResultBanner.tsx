import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { Outcome } from '../../../../lib/types'
import { sizedStyles, TableSize } from '../../sizes'

type Props = { size: TableSize; outcome: Outcome | null; delta: number; onNext: () => void }

export function ResultBanner({ size, outcome, delta, onNext }: Props) {
  const s = SHEETS[size]
  return (
    <View style={s.result}>
      <Text style={s.resultText}>
        {outcome === 'blackjack' ? '🃏 Blackjack!' :
         outcome === 'win' ? 'You Win!' :
         outcome === 'push' ? 'Push' :
         outcome === 'bust' ? 'Bust' : 'Dealer Wins'}
        {'  '}
        {delta >= 0 ? `+$${delta}` : `-$${Math.abs(delta)}`}
      </Text>
      <TouchableOpacity style={s.nextBtn} onPress={onNext}>
        <Text style={s.nextBtnText}>Next Hand</Text>
      </TouchableOpacity>
    </View>
  )
}

const base = StyleSheet.create({
  result: { backgroundColor: 'rgba(0,0,0,0.75)', padding: 20, margin: 12, borderRadius: 12, alignItems: 'center' },
  resultText: { color: '#FFD700', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  nextBtn: { backgroundColor: '#FFD700', paddingVertical: 10, paddingHorizontal: 32, borderRadius: 8 },
  nextBtnText: { fontWeight: '700', fontSize: 16 },
})

const SHEETS = sizedStyles(base, {
  result: { padding: 30, borderRadius: 18 },
  // Centred so a line that wraps in the 300dp landscape panel stays centred.
  resultText: { fontSize: 32, marginBottom: 18, textAlign: 'center' },
  nextBtn: { paddingVertical: 15, paddingHorizontal: 48, borderRadius: 12 },
  nextBtnText: { fontSize: 22 },
})
