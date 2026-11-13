jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
jest.mock('../../features/profile/pictures', () => {
  const actual = jest.requireActual('../../features/profile/pictures')
  return { ...actual, pickAndStoreUpload: jest.fn() }
})

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { PicturePicker } from '../../features/profile/components/PicturePicker'
import { AddMoneyModal } from '../../features/profile/components/AddMoneyModal'
import { PRESET_PICTURES, pickAndStoreUpload } from '../../features/profile/pictures'
import { ProfileList } from '../../features/profile/components/ProfileList'
import { CreateProfileModal } from '../../features/profile/components/CreateProfileModal'
import { useProfileStore } from '../../features/profile/store'
import { emptyStats } from '../../features/profile/stats'
import type { Profile } from '../../features/profile/types'

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
  expect(getByText('$')).toBeTruthy()
  fireEvent.press(getByText('Add'))
  expect(onAdd).not.toHaveBeenCalled()
  fireEvent.changeText(getByPlaceholderText('Amount'), '12.5')
  fireEvent.press(getByText('Add'))
  expect(onAdd).not.toHaveBeenCalled()
  fireEvent.changeText(getByPlaceholderText('Amount'), '100')
  fireEvent.press(getByText('Add'))
  expect(onAdd).toHaveBeenCalledWith(100)
})

function makeProfile(id: string, name: string): Profile {
  return {
    id, name, bankrollMode: 'finite', balance: 100, createdAt: 1,
    startingBalance: 100, trackingSince: 1, refills: [], stats: emptyStats(),
  }
}

test('profile list shows the active profile first, others in their original order', () => {
  const profiles = [makeProfile('a', 'Alice'), makeProfile('b', 'Bob'), makeProfile('c', 'Cara')]
  const { getAllByText } = render(
    <ProfileList profiles={profiles} activeProfileId="c" onOpen={jest.fn()} onDelete={jest.fn()} />
  )
  const names = getAllByText(/^(Alice|Bob|Cara)$/).map(n => n.props.children)
  expect(names).toEqual(['Cara', 'Alice', 'Bob'])
})

test('profile list keeps original order when no profile is active', () => {
  const profiles = [makeProfile('a', 'Alice'), makeProfile('b', 'Bob')]
  const { getAllByText } = render(
    <ProfileList profiles={profiles} activeProfileId={null} onOpen={jest.fn()} onDelete={jest.fn()} />
  )
  expect(getAllByText(/^(Alice|Bob)$/).map(n => n.props.children)).toEqual(['Alice', 'Bob'])
})

test('create profile shows a $ in front of the starting money', () => {
  useProfileStore.setState({ profiles: [], activeProfileId: null })
  const { getByText, getByDisplayValue, getByPlaceholderText } = render(
    <CreateProfileModal visible onClose={jest.fn()} />
  )
  expect(getByText('$')).toBeTruthy()
  expect(getByDisplayValue('1000')).toBeTruthy()
  fireEvent.changeText(getByPlaceholderText('Name'), 'Dana')
  fireEvent.changeText(getByDisplayValue('1000'), '250')
  fireEvent.press(getByText('Create'))
  expect(useProfileStore.getState().profiles[0]).toMatchObject({ name: 'Dana', balance: 250 })
})
