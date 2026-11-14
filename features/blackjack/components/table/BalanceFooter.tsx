import { View, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { sizedStyles, TableSize } from '../../sizes'

type Props = {
  size: TableSize
  balanceText: string
  negative: boolean
  showFundsWarning: boolean
}

export function BalanceFooter({ size, balanceText, negative, showFundsWarning }: Props) {
  const s = SHEETS[size]
  return (
    <View style={s.footer}>
      {showFundsWarning && <Text style={s.fundsWarning}>Insufficient funds</Text>}
      <Text style={[s.footerText, negative && s.negative]}>
        Balance: {balanceText}
      </Text>
    </View>
  )
}

const base = StyleSheet.create({
  footer: { padding: 12, backgroundColor: '#0a4a24', alignItems: 'flex-end' },
  footerText: { color: '#aaa', fontSize: 14 },
  negative: { color: '#ff5555' },
  fundsWarning: { color: '#e74c3c', fontSize: 12, fontWeight: '600', marginBottom: 2 },
})

const SHEETS = sizedStyles(base, {
  footer: { padding: 16 },
  footerText: { fontSize: 18 },
  fundsWarning: { fontSize: 16, marginBottom: 4 },
})
