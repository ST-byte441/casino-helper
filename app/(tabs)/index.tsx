import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfileStore } from '../../features/profile/store'

const GAMES = [
  { id: 'blackjack', label: 'Blackjack', available: true, route: '/blackjack' },
  { id: 'roulette', label: 'Roulette', available: false },
  { id: 'poker', label: 'Three Card Poker', available: false },
]

export default function LobbyScreen() {
  const router = useRouter()
  const { profiles, activeProfileId } = useProfileStore()
  const active = profiles.find(p => p.id === activeProfileId)
  const balance = active
    ? active.bankrollMode === 'infinite' ? '∞' : `$${active.balance}`
    : '—'

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.profileName}>{active?.name ?? 'No profile'}</Text>
        <Text style={styles.balance}>{balance}</Text>
      </View>
      <FlatList
        data={GAMES}
        keyExtractor={g => g.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.gameCard, !item.available && styles.disabled]}
            disabled={!item.available}
            onPress={() => item.available && item.route && router.push(item.route as any)}
          >
            <Text style={styles.gameLabel}>{item.label}</Text>
            {!item.available && <Text style={styles.soon}>Coming Soon</Text>}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  profileName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  balance: { color: '#FFD700', fontSize: 16, fontWeight: '700' },
  grid: { padding: 12 },
  gameCard: { flex: 1, margin: 8, aspectRatio: 1, backgroundColor: '#1e1e2e',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.4 },
  gameLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
  soon: { color: '#aaa', fontSize: 11, marginTop: 4 },
})
