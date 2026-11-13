import { View, Text, StyleSheet } from 'react-native'
import { Profile } from '../types'
import { gamesNet, refillTotal } from '../stats'
import { formatDate, formatMoney, formatSigned, signColor } from '../format'

export function BankrollBox({ profile }: { profile: Profile }) {
  const net = gamesNet(profile.stats)
  const migrated = profile.trackingSince !== profile.createdAt
  const started = formatMoney(profile.startingBalance) +
    (migrated ? ` · tracking since ${formatDate(profile.trackingSince, false)}` : '')
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Bankroll</Text>
      <View style={styles.row}><Text style={styles.label}>Started with</Text><Text style={styles.value}>{started}</Text></View>
      <View style={styles.row}>
        <Text style={styles.label}>Refills</Text>
        <Text style={styles.value}>{`${profile.refills.length} · ${formatMoney(refillTotal(profile.refills))}`}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Net all games</Text>
        <Text style={[styles.value, { color: signColor(net) }]}>{formatSigned(net)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#1e1e2e', borderRadius: 10, padding: 12, marginBottom: 12 },
  title: { color: '#FFD700', fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  label: { color: '#aaa' },
  value: { color: '#fff' },
})
