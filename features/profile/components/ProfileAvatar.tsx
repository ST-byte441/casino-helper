import React, { useEffect, useState } from 'react'
import { Image } from 'react-native'
import { ProfilePicture } from '../types'
import { DEFAULT_PICTURE, pictureSource } from '../pictures'

export function ProfileAvatar({ picture, size }: { picture?: ProfilePicture; size: number }) {
  const [failed, setFailed] = useState(false)
  const key = picture ? (picture.kind === 'upload' ? picture.uri : picture.id) : ''
  useEffect(() => setFailed(false), [key])
  return (
    <Image
      source={failed ? DEFAULT_PICTURE : pictureSource(picture)}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#2a2a3e' }}
    />
  )
}
