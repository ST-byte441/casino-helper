import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { GameId, ProfileStats } from '../types'
import { winRate } from '../stats'
import { formatMoney, formatSigned, signColor } from '../format'

export const GAME_TABS: { id: GameId; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
  { id: 'blackjack', label: 'Blackjack', icon: 'cards-playing-spade' },
  { id: 'baccarat', label: 'Baccarat', icon: 'cards' },
  { id: 'craps', label: 'Craps', icon: 'dice-5' },
]

type StatRow = { label: string; value: string; color?: string }

function rowsFor(id: GameId, stats: ProfileStats): StatRow[] {
  if (id === 'craps') {
    const c = stats.craps
    return [
      { label: 'Points made', value: String(c.pointsMade) },
      { label: 'Seven-outs', value: String(c.sevenOuts) },
      { label: 'Rolls', value: String(c.rolls) },
      { label: 'Biggest win', value: formatMoney(c.biggestWin) },
      { label: 'Lifetime', value: formatSigned(c.net), color: signColor(c.net) },
    ]
  }
  const r = stats[id]
  const rate = winRate(r)
  return [
    { label: 'Wins', value: String(r.wins) },
    { label: 'Losses', value: String(r.losses) },
    { label: id === 'baccarat' ? 'Ties' : 'Pushes', value: String(r.pushes) },
    { label: 'Win rate', value: rate === null ? '—' : `${(rate * 100).toFixed(1)}%` },
    { label: 'Biggest win', value: formatMoney(r.biggestWin) },
    { label: 'Lifetime', value: formatSigned(r.net), color: signColor(r.net) },
  ]
}

export function GameStatsTabs({ stats }: { stats: ProfileStats }) {
  const [tab, setTab] = useState<GameId>('blackjack')
  return (
    <View>
      <View style={styles.tabs}>
        {GAME_TABS.map(t => {
          const on = t.id === tab
          return (
            <TouchableOpacity key={t.id} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(t.id)}>
              <MaterialCommunityIcons name={t.icon} size={20} color={on ? '#FFD700' : '#aaa'} />
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <View style={styles.box}>
        {rowsFor(tab, stats).map(r => (
          <View key={r.label} style={styles.row}>
            <Text style={styles.label}>{r.label}</Text>
            <Text style={[styles.value, r.color ? { color: r.color } : null]}>{r.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  tabOn: { backgroundColor: '#2a2a3e' },
  tabText: { color: '#aaa', fontSize: 10, marginTop: 2 },
  tabTextOn: { color: '#FFD700' },
  box: { backgroundColor: '#1e1e2e', borderRadius: 10, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  label: { color: '#aaa' },
  value: { color: '#fff' },
})
