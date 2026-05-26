import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Profile } from '../types'

type Props = {
  profile: Profile
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export function ProfileCard({ profile, isActive, onSelect, onDelete }: Props) {
  const balance = profile.bankrollMode === 'infinite' ? '∞' : `$${profile.balance}`
  return (
    <TouchableOpacity style={[styles.card, isActive && styles.active]} onPress={onSelect}>
      <View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.balance}>{balance}</Text>
      </View>
      <TouchableOpacity onPress={onDelete}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, marginVertical: 6, borderRadius: 10, backgroundColor: '#1e1e2e', borderWidth: 2, borderColor: 'transparent' },
  active: { borderColor: '#FFD700' },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  balance: { color: '#aaa', fontSize: 14, marginTop: 2 },
  delete: { color: '#ff5555', fontSize: 18, paddingHorizontal: 8 },
})
