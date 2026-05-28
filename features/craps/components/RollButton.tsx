import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'

type Props = { disabled?: boolean; onRoll(): void }

export function RollButton({ disabled, onRoll }: Props) {
  return (
    <TouchableOpacity style={[styles.btn, disabled && styles.disabled]} disabled={disabled} onPress={onRoll}>
      <Text style={styles.text}>ROLL</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: { backgroundColor: '#FFD700', borderRadius: 10, padding: 18, alignItems: 'center', margin: 16 },
  disabled: { opacity: 0.4 },
  text: { color: '#13131f', fontWeight: '800', fontSize: 18, letterSpacing: 2 },
})
