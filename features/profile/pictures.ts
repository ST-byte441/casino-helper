import { ImageSourcePropType } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Directory, File, Paths } from 'expo-file-system'
import { ProfilePicture } from './types'

export const PRESET_PICTURES: { id: string; source: ImageSourcePropType }[] = [
  { id: 'auburn-ace-with-gold-earring-6', source: require('../../assets/avatars/auburn-ace-with-gold-earring-6.jpg') },
  { id: 'auburn-emerald-casino-muse-7', source: require('../../assets/avatars/auburn-emerald-casino-muse-7.jpg') },
  { id: 'burgundy-fox-card-shark-avatar-1', source: require('../../assets/avatars/burgundy-fox-card-shark-avatar-1.jpg') },
  { id: 'charming-teal-casino-jester-3', source: require('../../assets/avatars/charming-teal-casino-jester-3.jpg') },
  { id: 'coral-queen-of-hearts-avatar-1', source: require('../../assets/avatars/coral-queen-of-hearts-avatar-1.jpg') },
  { id: 'dapper-casino-cat-avatar-4', source: require('../../assets/avatars/dapper-casino-cat-avatar-4.jpg') },
  { id: 'elegant-poker-champion-with-red-chip-10', source: require('../../assets/avatars/elegant-poker-champion-with-red-chip-10.jpg') },
  { id: 'emerald-dragon-high-roller-avatar-8', source: require('../../assets/avatars/emerald-dragon-high-roller-avatar-8.jpg') },
  { id: 'five-pip-minimalist-die-icon-2', source: require('../../assets/avatars/five-pip-minimalist-die-icon-2.jpg') },
  { id: 'golden-lion-casino-avatar-2', source: require('../../assets/avatars/golden-lion-casino-avatar-2.jpg') },
  { id: 'golden-lion-casino-portrait-4', source: require('../../assets/avatars/golden-lion-casino-portrait-4.jpg') },
  { id: 'lucky-black-cat-casino-avatar-5', source: require('../../assets/avatars/lucky-black-cat-casino-avatar-5.jpg') },
  { id: 'minimalist-plain-red-poker-chip-1', source: require('../../assets/avatars/minimalist-plain-red-poker-chip-1.jpg') },
  { id: 'playful-emerald-dragon-avatar-8', source: require('../../assets/avatars/playful-emerald-dragon-avatar-8.jpg') },
  { id: 'red-and-black-jester-avatar-7', source: require('../../assets/avatars/red-and-black-jester-avatar-7.jpg') },
  { id: 'regal-queen-of-hearts-2', source: require('../../assets/avatars/regal-queen-of-hearts-2.jpg') },
  { id: 'silver-haired-casino-host-avatar-10', source: require('../../assets/avatars/silver-haired-casino-host-avatar-10.jpg') },
  { id: 'silver-haired-casino-host-avatar-6', source: require('../../assets/avatars/silver-haired-casino-host-avatar-6.jpg') },
  { id: 'sly-fox-with-spade-collar-3', source: require('../../assets/avatars/sly-fox-with-spade-collar-3.jpg') },
  { id: 'smiling-golden-dice-duo-9', source: require('../../assets/avatars/smiling-golden-dice-duo-9.jpg') },
]

export const DEFAULT_PICTURE: ImageSourcePropType = require('../../assets/avatars/default.jpg')

export function pictureSource(p: ProfilePicture | undefined): ImageSourcePropType {
  if (!p) return DEFAULT_PICTURE
  if (p.kind === 'upload') return { uri: p.uri }
  return PRESET_PICTURES.find(x => x.id === p.id)?.source ?? DEFAULT_PICTURE
}

export async function pickAndStoreUpload(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  })
  if (result.canceled || !result.assets?.[0]) return null
  const dir = new Directory(Paths.document, 'avatars')
  dir.create({ idempotent: true, intermediates: true })
  const name = Date.now().toString(36) + Math.random().toString(36).slice(2) + '.jpg'
  const dest = new File(dir, name)
  new File(result.assets[0].uri).copySync(dest)
  return dest.uri
}

export function deleteUploadedPicture(uri: string): void {
  try {
    new File(uri).delete()
  } catch {
    // best effort: file may already be gone
  }
}
