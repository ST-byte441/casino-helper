import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { FlashingBalance } from '../../../../components/FlashingBalance'
import { sizedStyles, TableSize } from '../../../../lib/tableSize'
import { formatMoney } from '../../../profile/format'

type Props = {
  size: TableSize
  /** 'bar': the footer strip (phones, large portrait). 'panel': the bottom of the landscape side panel. */
  variant?: 'bar' | 'panel'
  showFundsWarning: boolean
  /** The main-bet minimum to hint at while it isn't met, or null. */
  minBet: number | null
  balanceText: string
  /** The shown balance, for the red/green flash; null (infinite, no profile) never flashes. */
  value: number | null
  negative: boolean
  /** Next Hand at the result, DEAL while betting, nothing while revealing. */
  action: { label: 'Next Hand' | 'DEAL'; disabled: boolean; onPress(): void } | null
}

export function Footer({ size, variant = 'bar', showFundsWarning, minBet, balanceText, value, negative, action }: Props) {
  const s = SHEETS[size]
  const info = (
    <View>
      {showFundsWarning && <Text style={s.fundsWarning}>Insufficient funds</Text>}
      {minBet !== null && !showFundsWarning && (
        <Text style={s.minHint}>Min {formatMoney(minBet)} on Player or Banker</Text>
      )}
      <FlashingBalance testID="balance" value={value} color={negative ? NEGATIVE : BALANCE} style={s.balance}>
        Balance: {balanceText}
      </FlashingBalance>
    </View>
  )
  // Same elements as the original footer: Next Hand is never disabled; DEAL dims below the table minimum.
  const button = action && (action.label === 'Next Hand' ? (
    <TouchableOpacity style={s.dealBtn} onPress={action.onPress}>
      <Text style={s.dealText}>Next Hand</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      style={[s.dealBtn, action.disabled && s.dealDisabled]}
      disabled={action.disabled}
      onPress={action.onPress}
    >
      <Text style={s.dealText}>DEAL</Text>
    </TouchableOpacity>
  ))
  if (variant === 'panel') {
    // The button under the bet panel; the balance block pinned to the panel's bottom edge.
    return (
      <>
        {button && <View style={panel.action}>{button}</View>}
        <View style={panel.info}>{info}</View>
      </>
    )
  }
  return (
    <View style={s.footer}>
      {info}
      {button}
    </View>
  )
}

const BALANCE = '#aaa'
const NEGATIVE = '#ff5555'

const base = StyleSheet.create({
  footer: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 80 },
  balance: { fontSize: 14 },
  fundsWarning: { color: '#e74c3c', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  dealBtn: { backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14 },
  dealDisabled: { opacity: 0.4 },
  minHint: { color: '#aaa', fontSize: 12, marginBottom: 2 },
  dealText: { color: '#13131f', fontWeight: '800', fontSize: 16 },
})

const SHEETS = sizedStyles(base, {
  footer: { padding: 20, minHeight: 104 },
  balance: { fontSize: 18 },
  fundsWarning: { fontSize: 16, marginBottom: 4 },
  dealBtn: { borderRadius: 14, paddingHorizontal: 48, paddingVertical: 21, alignItems: 'center' },
  minHint: { fontSize: 16, marginBottom: 4 },
  dealText: { fontSize: 22 },
})

const panel = StyleSheet.create({
  action: { paddingHorizontal: 16, paddingVertical: 8 },
  info: { marginTop: 'auto', padding: 16 },
})
