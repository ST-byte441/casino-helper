import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

const SANDBOXES = [
  { id: 'blackjack', label: 'Blackjack', available: true, route: '/sandbox/blackjack' },
]

export default function SandboxLobbyScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Strategy Sandbox</Text>
      </View>
      <FlatList
        data={SANDBOXES}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.gameCard, !item.available && styles.disabled]}
            disabled={!item.available}
            onPress={() => item.available && router.push(item.route as any)}
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
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  heading: { color: '#fff', fontSize: 20, fontWeight: '700' },
  grid: { padding: 12 },
  gameCard: { marginHorizontal: 12, marginVertical: 6, height: 80, backgroundColor: '#1e1e2e',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.4 },
  gameLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
  soon: { color: '#aaa', fontSize: 11, marginTop: 4 },
})
