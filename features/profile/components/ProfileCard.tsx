import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Profile } from '../types'
import { ProfileAvatar } from './ProfileAvatar'
import { formatMoney } from '../format'

type Props = {
  profile: Profile
  isActive: boolean
  onOpen: () => void
  onDelete: () => void
}

export function ProfileCard({ profile, isActive, onOpen, onDelete }: Props) {
  const infinite = profile.bankrollMode === 'infinite'
  const balance = infinite ? '∞' : formatMoney(profile.balance)
  return (
    <TouchableOpacity style={[styles.card, isActive && styles.active]} onPress={onOpen}>
      <ProfileAvatar picture={profile.picture} size={40} />
      <View style={styles.info}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={[styles.balance, !infinite && profile.balance < 0 && styles.negative]}>{balance}</Text>
      </View>
      <TouchableOpacity onPress={onDelete}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center',
    padding: 16, marginVertical: 6, borderRadius: 10, backgroundColor: '#1e1e2e', borderWidth: 2, borderColor: 'transparent' },
  active: { borderColor: '#FFD700' },
  info: { flex: 1, marginLeft: 12 },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  balance: { color: '#aaa', fontSize: 14, marginTop: 2 },
  negative: { color: '#ff5555' },
  delete: { color: '#ff5555', fontSize: 18, paddingHorizontal: 8 },
})
