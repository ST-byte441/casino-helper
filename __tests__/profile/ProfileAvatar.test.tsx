import React from 'react'
import { render } from '@testing-library/react-native'
import { Image } from 'react-native'
import { ProfileAvatar } from '../../features/profile/components/ProfileAvatar'
import { DEFAULT_PICTURE } from '../../features/profile/pictures'


test('swaps to the default picture when an upload fails to load', () => {
  const { UNSAFE_getByType } = render(
    <ProfileAvatar picture={{ kind: 'upload', uri: 'file:///gone.jpg' }} size={48} />
  )
  const img = UNSAFE_getByType(Image)
  expect(img.props.source).toEqual({ uri: 'file:///gone.jpg' })
  React.act(() => img.props.onError())
  expect(UNSAFE_getByType(Image).props.source).toBe(DEFAULT_PICTURE)
})
