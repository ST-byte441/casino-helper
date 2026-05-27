import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native'

type Props = {
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  onDismiss: () => void
  visible?: boolean
}

export default function UpdateModal({ currentVersion, latestVersion, releaseUrl, onDismiss, visible }: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible ?? true} onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.body}>
            A new version of Casino Helper is available.
          </Text>
          <View style={styles.versions}>
            <Text style={styles.versionLabel}>Current: <Text style={styles.versionValue}>v{currentVersion}</Text></Text>
            <Text style={styles.versionLabel}>Latest: <Text style={[styles.versionValue, styles.latest]}>v{latestVersion}</Text></Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn} onPress={() => { Linking.openURL(releaseUrl).catch(() => {}) }}>
            <Text style={styles.downloadText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  body: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  versions: { alignSelf: 'stretch', marginBottom: 24, gap: 4 },
  versionLabel: { color: '#aaa', fontSize: 14 },
  versionValue: { color: '#fff', fontWeight: '600' },
  latest: { color: '#FFD700' },
  downloadBtn: {
    width: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  downloadText: { color: '#13131f', fontSize: 16, fontWeight: '700' },
  dismissBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissText: { color: '#aaa', fontSize: 14 },
})
