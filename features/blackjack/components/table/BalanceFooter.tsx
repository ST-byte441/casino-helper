import { View, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { sizedStyles, TableSize } from '../../../../lib/tableSize'

type Props = {
  size: TableSize
  balanceText: string
  negative: boolean
  showFundsWarning: boolean
  /** 'bar': full-width footer strip (phone, large portrait). 'panel': pinned to the bottom of the landscape side panel. */
  variant?: 'bar' | 'panel'
}

export function BalanceFooter({ size, balanceText, negative, showFundsWarning, variant = 'bar' }: Props) {
  const s = SHEETS[size]
  return (
    <View style={variant === 'panel' ? [s.footer, panelStyles.footer] : s.footer}>
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

// The panel already has the header's background; push the balance to the panel's bottom edge.
const panelStyles = StyleSheet.create({
  footer: { marginTop: 'auto', backgroundColor: 'transparent', alignItems: 'flex-start' },
})
