import React, { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleProp, StyleSheet, TextStyle, TouchableOpacity, View } from 'react-native'
import { Text } from './Text'

export type InfoTab = { key: string; label: string; title: string; content: React.ReactNode }

type SheetProps = {
  visible: boolean
  /** testID of the card; the backdrop, close button and tabs get `-backdrop`, `-close` and `-tab-<key>`. */
  testID: string
  onClose(): void
  /** A single page: its title and content. */
  title?: string
  children?: React.ReactNode
  /** Or several pages under a tab bar; the sheet opens (and reopens) on `initialTab`, else the first. */
  tabs?: InfoTab[]
  initialTab?: string
}

/**
 * A scrolling info pop-up (e.g. what Assist shows). The close-on-tap backdrop sits behind the card, not round it: a
 * pressable card takes the touch and its ScrollView won't scroll (seen on landscape phones).
 */
export function InfoSheet({ visible, title, testID, onClose, children, tabs, initialTab }: SheetProps) {
  const first = initialTab ?? tabs?.[0]?.key
  const [tab, setTab] = useState(first)
  useEffect(() => { if (visible) setTab(first) }, [visible])
  const page = tabs?.find(t => t.key === tab) ?? tabs?.[0]
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable testID={`${testID}-backdrop`} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View testID={testID} style={styles.card}>
          {tabs && (
            <View style={styles.tabs}>
              {tabs.map(t => (
                <TouchableOpacity key={t.key} testID={`${testID}-tab-${t.key}`} accessibilityRole="tab"
                  accessibilityState={{ selected: t.key === page?.key }} onPress={() => setTab(t.key)}
                  style={[styles.tab, t.key === page?.key && styles.tabOn]}>
                  <Text style={[styles.tabText, t.key === page?.key && styles.tabTextOn]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={infoStyles.title}>{page ? page.title : title}</Text>
            {page ? page.content : children}
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

/** "ⓘ How to play" for a setup screen's title row; opens that game's guide. */
export function HowToPlayButton({ onPress }: { onPress(): void }) {
  return (
    <TouchableOpacity testID="how-to-play-button" accessibilityLabel="How to play" onPress={onPress} hitSlop={8}>
      <Text style={styles.howToPlay}>ⓘ How to play</Text>
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
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#2a2a3e', alignItems: 'center' },
  tabOn: { backgroundColor: '#FFD700' },
  tabText: { color: '#ccc', fontWeight: '700', fontSize: 13 },
  tabTextOn: { color: '#13131f' },
  close: { backgroundColor: '#FFD700', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  closeText: { color: '#13131f', fontWeight: '800', fontSize: 15 },
  howToPlay: { color: '#FFD700', fontSize: 14, fontWeight: '600' },
})
