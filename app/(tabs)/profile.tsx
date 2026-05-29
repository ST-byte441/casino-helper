import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useProfileStore } from '../../features/profile/store'
import { ProfileList } from '../../features/profile/components/ProfileList'
import { CreateProfileModal } from '../../features/profile/components/CreateProfileModal'

export default function ProfileScreen() {
  const { profiles, activeProfileId, setActiveProfile, deleteProfile } = useProfileStore()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Profiles</Text>
      <ProfileList
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelect={setActiveProfile}
        onDelete={deleteProfile}
      />
      <TouchableOpacity style={styles.btn} onPress={() => setShowCreate(true)}>
        <Text style={styles.btnText}>+ New Profile</Text>
      </TouchableOpacity>
      <CreateProfileModal visible={showCreate} onClose={() => setShowCreate(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f', padding: 16 },
  heading: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  btn: { backgroundColor: '#FFD700', borderRadius: 8, padding: 14, alignItems: 'center', margin: 16 },
  btnText: { fontWeight: '700', fontSize: 16 },
})
