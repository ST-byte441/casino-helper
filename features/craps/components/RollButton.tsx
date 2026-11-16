import React from 'react'
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Text } from '../../../components/Text'

type Props = { disabled?: boolean; onRoll(): void; testID?: string; style?: StyleProp<ViewStyle> }

export function RollButton({ disabled, onRoll, testID, style }: Props) {
  // The list passes neither testID nor style; leave its props exactly as they were.
  const extra = testID ? { testID } : {}
  return (
    <TouchableOpacity {...extra} style={style ? [styles.btn, disabled && styles.disabled, style] : [styles.btn, disabled && styles.disabled]}
      disabled={disabled} onPress={onRoll}>
      <Text style={styles.text}>ROLL</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: { backgroundColor: '#FFD700', borderRadius: 10, padding: 18, alignItems: 'center', margin: 16 },
  disabled: { opacity: 0.4 },
  text: { color: '#13131f', fontWeight: '800', fontSize: 18, letterSpacing: 2 },
})
