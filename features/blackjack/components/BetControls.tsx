import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '../../../components/Text'
import { CHIP_DENOMINATIONS, TABLE_MINIMUM } from '../../../lib/constants'
import { sizedStyles, TableSize } from '../../../lib/tableSize'

type Props = {
  bet: number
  balance: number
  isInfinite: boolean
  onPlaceBet: (amount: number) => void
  onClearBet: () => void
  onDeal: () => void
  onInsufficientFunds?: () => void
  size?: TableSize
}

export function BetControls({ bet, balance, isInfinite, onPlaceBet, onClearBet, onDeal, onInsufficientFunds, size = 'regular' }: Props) {
  const s = SHEETS[size]
  return (
    <View style={s.container}>
      <View style={s.chips}>
        {CHIP_DENOMINATIONS.map(denom => {
          const canAfford = isInfinite || bet + denom <= balance
          return (
            <TouchableOpacity
              key={denom}
              style={[s.chip, !canAfford && s.chipDisabled]}
              onPress={() => {
                if (!canAfford) { onInsufficientFunds?.(); return }
                onPlaceBet(denom)
              }}
            >
              <Text style={s.chipText}>${denom}</Text>
            </TouchableOpacity>
          )
        })}
        <TouchableOpacity style={s.clear} onPress={onClearBet}>
          <Text
            style={s.clearText}
            // Large text in the narrow landscape panel: keep "Clear" on one line (phones unchanged).
            {...(size === 'large' ? { numberOfLines: 1, adjustsFontSizeToFit: true } : {})}
          >
            Clear
          </Text>
        </TouchableOpacity>
      </View>
      <View style={s.betRow}>
        <Text style={s.betLabel}>Bet: <Text style={s.betAmount}>${bet}</Text></Text>
        <TouchableOpacity
          style={[s.deal, bet < TABLE_MINIMUM && s.dealDisabled]}
          disabled={bet < TABLE_MINIMUM}
          onPress={onDeal}
        >
          <Text style={s.dealText}>Deal</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const base = StyleSheet.create({
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

const SHEETS = sizedStyles(base, {
  chips: { gap: 12, marginBottom: 18 },
  chip: { paddingVertical: 18 },
  chipText: { fontSize: 22 },
  clear: { paddingVertical: 18 },
  clearText: { fontSize: 22 },
  betLabel: { fontSize: 22 },
  deal: { paddingVertical: 15, paddingHorizontal: 42 },
  dealText: { fontSize: 22 },
})
