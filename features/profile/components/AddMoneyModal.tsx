import { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { MoneyInput } from './MoneyInput'
import { parseAddAmount } from '../stats'

type Props = { visible: boolean; onClose: () => void; onAdd: (amount: number) => void }

export function AddMoneyModal({ visible, onClose, onAdd }: Props) {
  const [text, setText] = useState('')
  const amount = parseAddAmount(text)

  function handleAdd() {
    if (amount === null) return
    onAdd(amount)
    setText('')
  }

  function handleClose() {
    setText('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add Money</Text>
          <MoneyInput placeholder="Amount" value={text} onChangeText={setText} />
          <TouchableOpacity style={[styles.btn, amount === null && styles.disabled]}
            disabled={amount === null} onPress={handleAdd}>
            <Text style={styles.btnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#1e1e2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  btn: { backgroundColor: '#FFD700', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  disabled: { opacity: 0.4 },
  btnText: { fontWeight: '700', fontSize: 16 },
  cancel: { color: '#aaa', textAlign: 'center', padding: 8 },
})
