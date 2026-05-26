import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CHIP_DENOMINATIONS, TABLE_MINIMUM } from '../../../lib/constants'

type Props = {
  bet: number
  balance: number
  isInfinite: boolean
  onPlaceBet: (amount: number) => void
  onClearBet: () => void
  onDeal: () => void
}

export function BetControls({ bet, balance, isInfinite, onPlaceBet, onClearBet, onDeal }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {CHIP_DENOMINATIONS.map(denom => {
          const disabled = !isInfinite && balance < denom
          return (
            <TouchableOpacity
              key={denom}
              style={[styles.chip, disabled && styles.chipDisabled]}
              disabled={disabled}
              onPress={() => onPlaceBet(denom)}
            >
              <Text style={styles.chipText}>${denom}</Text>
            </TouchableOpacity>
          )
        })}
        <TouchableOpacity style={styles.clear} onPress={onClearBet}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.betRow}>
        <Text style={styles.betLabel}>Bet: <Text style={styles.betAmount}>${bet}</Text></Text>
        <TouchableOpacity
          style={[styles.deal, bet < TABLE_MINIMUM && styles.dealDisabled]}
          disabled={bet < TABLE_MINIMUM}
          onPress={onDeal}
        >
          <Text style={styles.dealText}>Deal</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 12, backgroundColor: '#1e1e2e', borderRadius: 12, margin: 8 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { flex: 1, paddingVertical: 12, backgroundColor: '#FFD700', borderRadius: 8, alignItems: 'center' },
  chipDisabled: { opacity: 0.3 },
  chipText: { fontWeight: '700', fontSize: 15, color: '#000' },
  clear: { flex: 1, paddingVertical: 12, backgroundColor: '#3a3a4e', borderRadius: 8, alignItems: 'center' },
  clearText: { color: '#aaa', fontWeight: '600' },
  betRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  betLabel: { color: '#aaa', fontSize: 15 },
  betAmount: { color: '#fff', fontWeight: '700' },
  deal: { backgroundColor: '#22c55e', paddingVertical: 10, paddingHorizontal: 28, borderRadius: 8 },
  dealDisabled: { opacity: 0.3 },
  dealText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
