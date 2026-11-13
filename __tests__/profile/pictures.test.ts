jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}))
const mockCopySync = jest.fn()
const mockDelete = jest.fn()
const mockCreate = jest.fn()
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///doc/' },
  Directory: jest.fn().mockImplementation((...parts: string[]) => ({
    uri: parts.join('/'),
    create: mockCreate,
  })),
  File: jest.fn().mockImplementation((...parts: any[]) => ({
    uri: parts.map(p => (typeof p === 'string' ? p : p.uri)).join('/'),
    copySync: mockCopySync,
    delete: mockDelete,
  })),
}))

import * as ImagePicker from 'expo-image-picker'
import {
  PRESET_PICTURES,
  DEFAULT_PICTURE,
  pictureSource,
  pickAndStoreUpload,
  deleteUploadedPicture,
} from '../../features/profile/pictures'

beforeEach(() => jest.clearAllMocks())

test('20 presets with unique ids, none is default', () => {
  expect(PRESET_PICTURES).toHaveLength(20)
  const ids = PRESET_PICTURES.map(p => p.id)
  expect(new Set(ids).size).toBe(20)
  expect(ids).not.toContain('default')
  expect(ids).toEqual([...ids].sort())
})

test('pictureSource falls back to default', () => {
  expect(pictureSource(undefined)).toBe(DEFAULT_PICTURE)
  expect(pictureSource({ kind: 'preset', id: 'nope' })).toBe(DEFAULT_PICTURE)
  expect(pictureSource({ kind: 'preset', id: PRESET_PICTURES[3].id })).toBe(PRESET_PICTURES[3].source)
  expect(pictureSource({ kind: 'upload', uri: 'file:///x.jpg' })).toEqual({ uri: 'file:///x.jpg' })
})

test('pickAndStoreUpload returns null when cancelled', async () => {
  ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null })
  expect(await pickAndStoreUpload()).toBeNull()
  expect(mockCopySync).not.toHaveBeenCalled()
})

test('pickAndStoreUpload copies the picked image into the avatars dir', async () => {
  ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///cache/pick.jpg' }],
  })
  const uri = await pickAndStoreUpload()
  expect(uri).toMatch(/^file:\/\/\/doc\/\/?avatars\/.+\.jpg$|avatars.*\.jpg$/)
  expect(mockCreate).toHaveBeenCalled()
  expect(mockCopySync).toHaveBeenCalledTimes(1)
})

test('deleteUploadedPicture never throws', () => {
  mockDelete.mockImplementation(() => { throw new Error('boom') })
  expect(() => deleteUploadedPicture('file:///a.jpg')).not.toThrow()
})
