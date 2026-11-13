import { FlatList } from 'react-native'
import { Profile } from '../types'
import { ProfileCard } from './ProfileCard'

type Props = {
  profiles: Profile[]
  activeProfileId: string | null
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}

export function ProfileList({ profiles, activeProfileId, onOpen, onDelete }: Props) {
  return (
    <FlatList
      data={profiles}
      keyExtractor={p => p.id}
      renderItem={({ item }) => (
        <ProfileCard
          profile={item}
          isActive={item.id === activeProfileId}
          onOpen={() => onOpen(item.id)}
          onDelete={() => onDelete(item.id)}
        />
      )}
    />
  )
}
