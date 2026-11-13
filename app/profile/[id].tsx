import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useProfileStore } from '../../features/profile/store'
import { ProfileAvatar } from '../../features/profile/components/ProfileAvatar'
import { BankrollBox } from '../../features/profile/components/BankrollBox'
import { GameStatsTabs } from '../../features/profile/components/GameStatsTabs'
import { AddMoneyModal } from '../../features/profile/components/AddMoneyModal'
import { PicturePicker } from '../../features/profile/components/PicturePicker'
import { formatDate, formatMoney } from '../../features/profile/format'

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const profile = useProfileStore(s => s.profiles.find(p => p.id === id))
  const isActive = useProfileStore(s => s.activeProfileId === id)
  const setActiveProfile = useProfileStore(s => s.setActiveProfile)
  const addMoney = useProfileStore(s => s.addMoney)
  const setPicture = useProfileStore(s => s.setPicture)
  const [showAdd, setShowAdd] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Profile not found</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.back()}>
          <Text style={styles.addText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const infinite = profile.bankrollMode === 'infinite'

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.back}>‹ Back</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hdr}>
          <TouchableOpacity testID="avatar-button" onPress={() => setShowPicker(true)}>
            <View style={styles.avRing}><ProfileAvatar picture={profile.picture} size={72} /></View>
          </TouchableOpacity>
          <View style={styles.hdrText}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.sub}>{`Created ${formatDate(profile.createdAt)}`}</Text>
          </View>
          {isActive ? (
            <Text style={styles.activeLabel}>Active</Text>
          ) : (
            <TouchableOpacity style={styles.setActive} onPress={() => setActiveProfile(profile.id)}>
              <Text style={styles.setActiveText}>Set Active</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.balance, !infinite && profile.balance < 0 && styles.negative]}>
          {infinite ? '∞' : formatMoney(profile.balance)}
        </Text>
        {!infinite && (
          <>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
              <Text style={styles.addText}>+ Add Money</Text>
            </TouchableOpacity>
            <BankrollBox profile={profile} />
          </>
        )}
        <GameStatsTabs stats={profile.stats} />
      </ScrollView>
      <AddMoneyModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={amount => { if (addMoney(profile.id, amount)) setShowAdd(false) }}
      />
      <PicturePicker
        visible={showPicker}
        current={profile.picture}
        onClose={() => setShowPicker(false)}
        onSave={p => { setPicture(profile.id, p); setShowPicker(false) }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  scroll: { padding: 16 },
  backBtn: { paddingHorizontal: 16, paddingTop: 8 },
  back: { color: '#FFD700', fontSize: 16 },
  hdr: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avRing: { borderWidth: 2, borderColor: '#FFD700', borderRadius: 40, padding: 1 },
  hdrText: { flex: 1, marginLeft: 12 },
  name: { color: '#fff', fontSize: 20, fontWeight: '600' },
  sub: { color: '#aaa', fontSize: 12 },
  activeLabel: { color: '#FFD700', fontWeight: '600' },
  setActive: { borderWidth: 1, borderColor: '#FFD700', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  setActiveText: { color: '#FFD700', fontWeight: '600' },
  balance: { fontSize: 30, fontWeight: '700', color: '#FFD700', textAlign: 'center', marginVertical: 6 },
  negative: { color: '#ff5555' },
  addBtn: { backgroundColor: '#FFD700', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12, marginHorizontal: 16 },
  addText: { color: '#13131f', fontWeight: '700', fontSize: 16 },
  notFound: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 40, marginBottom: 20 },
})
