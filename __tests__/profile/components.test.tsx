jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }))
jest.mock('expo-file-system', () => ({ Directory: class {}, File: class {}, Paths: {} }))
jest.mock('../../features/profile/pictures', () => {
  const actual = jest.requireActual('../../features/profile/pictures')
  return { ...actual, pickAndStoreUpload: jest.fn() }
})

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { PicturePicker } from '../../features/profile/components/PicturePicker'
import { AddMoneyModal } from '../../features/profile/components/AddMoneyModal'
import { PRESET_PICTURES, pickAndStoreUpload } from '../../features/profile/pictures'

test('picker saves selected preset', () => {
  const onSave = jest.fn()
  const { getByTestId, getByText } = render(
    <PicturePicker visible current={undefined} onClose={jest.fn()} onSave={onSave} />
  )
  fireEvent.press(getByTestId(`preset-${PRESET_PICTURES[2].id}`))
  fireEvent.press(getByText('Save'))
  expect(onSave).toHaveBeenCalledWith({ kind: 'preset', id: PRESET_PICTURES[2].id })
})

test('picker upload failure keeps picker usable', async () => {
  ;(pickAndStoreUpload as jest.Mock).mockRejectedValueOnce(new Error('copy failed'))
  const onSave = jest.fn()
  const { getByText } = render(<PicturePicker visible current={undefined} onClose={jest.fn()} onSave={onSave} />)
  fireEvent.press(getByText('Upload'))
  await waitFor(() => getByText('Could not save that photo'))
  expect(onSave).not.toHaveBeenCalled()
})

test('picker upload selects uploaded uri', async () => {
  ;(pickAndStoreUpload as jest.Mock).mockResolvedValueOnce('file:///a.jpg')
  const onSave = jest.fn()
  const { getByText, queryByText } = render(<PicturePicker visible current={undefined} onClose={jest.fn()} onSave={onSave} />)
  fireEvent.press(getByText('Upload'))
  await waitFor(() => expect(queryByText('Upload')).toBeNull())
  fireEvent.press(getByText('Save'))
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ kind: 'upload', uri: 'file:///a.jpg' }))
})

test('add money button disabled until valid', () => {
  const onAdd = jest.fn()
  const { getByText, getByPlaceholderText } = render(<AddMoneyModal visible onClose={jest.fn()} onAdd={onAdd} />)
  fireEvent.press(getByText('Add'))
  expect(onAdd).not.toHaveBeenCalled()
  fireEvent.changeText(getByPlaceholderText('Amount'), '12.5')
  fireEvent.press(getByText('Add'))
  expect(onAdd).not.toHaveBeenCalled()
  fireEvent.changeText(getByPlaceholderText('Amount'), '100')
  fireEvent.press(getByText('Add'))
  expect(onAdd).toHaveBeenCalledWith(100)
})
