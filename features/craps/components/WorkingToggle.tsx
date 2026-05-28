import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'

type Props = { working: boolean; onToggle(): void }

export function WorkingToggle({ working, onToggle }: Props) {
  return (
    <TouchableOpacity style={[styles.pill, working ? styles.on : styles.off]} onPress={onToggle}>
      <Text style={[styles.text, working ? styles.textOn : styles.textOff]}>{working ? 'ON' : 'OFF'}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  on: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  off: { backgroundColor: 'transparent', borderColor: '#555' },
  text: { fontSize: 11, fontWeight: '700' },
  textOn: { color: '#13131f' },
  textOff: { color: '#555' },
})
