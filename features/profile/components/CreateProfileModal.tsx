import { useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native'
import { useProfileStore } from '../store'

type Props = { visible: boolean; onClose: () => void }

export function CreateProfileModal({ visible, onClose }: Props) {
  const addProfile = useProfileStore(s => s.addProfile)
  const [name, setName] = useState('')
  const [chips, setChips] = useState('1000')
  const [infinite, setInfinite] = useState(false)

  function handleCreate() {
    if (!name.trim()) return
    addProfile(name.trim(), parseInt(chips) || 1000, infinite ? 'infinite' : 'finite')
    setName(''); setChips('1000'); setInfinite(false)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>New Profile</Text>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#666"
            value={name} onChangeText={setName} />
          {!infinite && (
            <TextInput style={styles.input} placeholder="Starting chips" placeholderTextColor="#666"
              keyboardType="numeric" value={chips} onChangeText={setChips} />
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Infinite bankroll</Text>
            <Switch value={infinite} onValueChange={setInfinite} trackColor={{ true: '#FFD700' }} />
          </View>
          <TouchableOpacity style={styles.btn} onPress={handleCreate}>
            <Text style={styles.btnText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#1e1e2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: '#2a2a3e', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { color: '#fff', fontSize: 16 },
  btn: { backgroundColor: '#FFD700', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  btnText: { fontWeight: '700', fontSize: 16 },
  cancel: { color: '#aaa', textAlign: 'center', padding: 8 },
})
