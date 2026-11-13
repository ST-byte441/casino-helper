import { View, Text, TextInput, StyleSheet } from 'react-native'

type Props = {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
}

// Numeric input with a fixed "$" in front, so it's clear the number is money.
export function MoneyInput({ value, onChangeText, placeholder }: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.currency}>$</Text>
      <TextInput style={styles.text} placeholder={placeholder} placeholderTextColor="#666"
        keyboardType="number-pad" value={value} onChangeText={onChangeText} />
    </View>
  )
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a3e', borderRadius: 8, paddingLeft: 12, marginBottom: 12 },
  currency: { color: '#FFD700', fontSize: 16, fontWeight: '700' },
  text: { flex: 1, color: '#fff', padding: 12, paddingLeft: 6 },
})
