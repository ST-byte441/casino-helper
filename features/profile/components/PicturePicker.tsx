import { useEffect, useState } from 'react'
import { Modal, View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { ProfilePicture } from '../types'
import { PRESET_PICTURES, pictureSource, pickAndStoreUpload } from '../pictures'

type Props = {
  visible: boolean
  current: ProfilePicture | undefined
  onClose: () => void
  onSave: (p: ProfilePicture) => void
}

export function PicturePicker({ visible, current, onClose, onSave }: Props) {
  const [selected, setSelected] = useState<ProfilePicture | undefined>(current)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (visible) { setSelected(current); setError(false) }
  }, [visible])

  async function handleUpload() {
    setError(false)
    try {
      const uri = await pickAndStoreUpload()
      if (uri) setSelected({ kind: 'upload', uri })
    } catch {
      setError(true)
    }
  }

  const isSel = (p: ProfilePicture) =>
    !!selected && selected.kind === p.kind &&
    (selected.kind === 'preset' ? selected.id === (p as { id: string }).id : selected.uri === (p as { uri: string }).uri)

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Choose a picture</Text>
          <Text style={styles.sub}>Tap one, or upload your own</Text>
          <ScrollView>
            <View style={styles.grid}>
              <TouchableOpacity style={styles.cell} onPress={handleUpload}>
                {selected?.kind === 'upload' ? (
                  <Image source={pictureSource(selected)} style={[styles.img, styles.on]} />
                ) : (
                  <View style={[styles.img, styles.upload]}>
                    <Text style={styles.plus}>＋</Text>
                    <Text style={styles.uploadText}>Upload</Text>
                  </View>
                )}
              </TouchableOpacity>
              {PRESET_PICTURES.map(p => (
                <TouchableOpacity key={p.id} style={styles.cell} testID={`preset-${p.id}`}
                  onPress={() => setSelected({ kind: 'preset', id: p.id })}>
                  <Image source={p.source} style={[styles.img, isSel({ kind: 'preset', id: p.id }) && styles.on]} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {error && <Text style={styles.error}>Could not save that photo</Text>}
          <TouchableOpacity style={[styles.btn, !selected && styles.disabled]} disabled={!selected}
            onPress={() => selected && onSave(selected)}>
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#13131f', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  title: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sub: { color: '#aaa', fontSize: 12, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '25%', alignItems: 'center', marginBottom: 10 },
  img: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: 'transparent' },
  on: { borderColor: '#FFD700' },
  upload: { backgroundColor: '#1e1e2e', borderColor: '#555', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  plus: { color: '#aaa', fontSize: 20 },
  uploadText: { color: '#aaa', fontSize: 10 },
  error: { color: '#ff5555', textAlign: 'center', marginTop: 8 },
  btn: { backgroundColor: '#FFD700', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  disabled: { opacity: 0.4 },
  btnText: { color: '#13131f', fontWeight: '700', fontSize: 16 },
  cancel: { color: '#aaa', textAlign: 'center', padding: 8 },
})
