import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useProfileStore } from '../../features/profile/store'
import { formatMoney } from '../../features/profile/format'
import { ProfileAvatar } from '../../features/profile/components/ProfileAvatar'

const GAMES = [
  { id: 'blackjack', label: 'Blackjack', available: true, route: '/blackjack' },
  { id: 'craps', label: 'Craps', available: true, route: '/craps' },
  { id: 'baccarat', label: 'Baccarat', available: true, route: '/baccarat' },
  { id: 'roulette', label: 'Roulette', available: true, route: '/roulette' },
  { id: 'poker', label: 'Three Card Poker', available: false },
]

export default function LobbyScreen() {
  const router = useRouter()
  const { profiles, activeProfileId } = useProfileStore()
  const active = profiles.find(p => p.id === activeProfileId)
  const isInfinite = active?.bankrollMode === 'infinite'
  const balance = active
    ? isInfinite ? '∞' : formatMoney(active.balance)
    : '—'
  const isNegative = !!active && !isInfinite && active.balance < 0

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="lobby-profile-button"
          style={styles.profileButton}
          accessibilityRole="button"
          accessibilityLabel={active ? 'Open profile stats' : 'Open profiles'}
          onPress={() => (active ? router.push(`/profile/${active.id}`) : router.navigate('/(tabs)/profile'))}
        >
          <ProfileAvatar picture={active?.picture} size={36} />
          <Text style={styles.profileName} numberOfLines={1}>{active?.name ?? 'No profile'}</Text>
        </TouchableOpacity>
        {active && <Text style={[styles.balance, isNegative && styles.negative]}>{balance}</Text>}
      </View>
      <FlatList
        data={GAMES}
        keyExtractor={g => g.id}
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
  profileButton: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, marginRight: 12 },
  profileName: { color: '#fff', fontSize: 20, fontWeight: '600', flexShrink: 1 },
  balance: { color: '#FFD700', fontSize: 20, fontWeight: '700' },
  negative: { color: '#ff5555' },
  grid: { padding: 12 },
  gameCard: { marginHorizontal: 12, marginVertical: 6, height: 80, backgroundColor: '#1e1e2e',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.4 },
  gameLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
  soon: { color: '#aaa', fontSize: 11, marginTop: 4 },
})
