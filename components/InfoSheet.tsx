import React from 'react'
import { Modal, Pressable, ScrollView, StyleProp, StyleSheet, TextStyle, TouchableOpacity, View } from 'react-native'
import { Text } from './Text'

type SheetProps = {
  visible: boolean
  title: string
  /** testID of the card; the backdrop and the close button get `-backdrop` and `-close`. */
  testID: string
  onClose(): void
  children: React.ReactNode
}

/**
 * A scrolling info pop-up (e.g. what Assist shows). The close-on-tap backdrop sits behind the card, not round it: a
 * pressable card takes the touch and its ScrollView won't scroll (seen on landscape phones).
 */
export function InfoSheet({ visible, title, testID, onClose, children }: SheetProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable testID={`${testID}-backdrop`} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View testID={testID} style={styles.card}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={infoStyles.title}>{title}</Text>
            {children}
          </ScrollView>
          <TouchableOpacity testID={`${testID}-close`} style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

/** The small ⓘ that opens an InfoSheet. Put it left of a toggle, clear of the toggle's on/off dot. */
export function InfoButton({ onPress, style, testID, label }: {
  onPress(): void; style: StyleProp<TextStyle>; testID: string; label: string
}) {
  return (
    <TouchableOpacity testID={testID} accessibilityLabel={label} onPress={onPress} hitSlop={10}>
      <Text style={style}>ⓘ</Text>
    </TouchableOpacity>
  )
}

export function Bullet({ children }: { children: React.ReactNode }) {
  return <Text style={infoStyles.body}>•  {children}</Text>
}

/** Text styles for InfoSheet content. */
export const infoStyles = StyleSheet.create({
  title: { color: '#FFD700', fontWeight: '800', fontSize: 17 },
  heading: { color: '#fff', fontWeight: '800', fontSize: 14, marginTop: 6 },
  body: { color: '#ccc', fontSize: 13, lineHeight: 18 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemText: { color: '#ccc', fontSize: 13, lineHeight: 18, flex: 1 },
  strong: { color: '#fff', fontWeight: '800' },
})

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#1e1e2e', borderRadius: 12, maxWidth: 520, width: '100%', maxHeight: '100%', padding: 14 },
  content: { gap: 8, paddingBottom: 4 },
  close: { backgroundColor: '#FFD700', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  closeText: { color: '#13131f', fontWeight: '800', fontSize: 15 },
})
