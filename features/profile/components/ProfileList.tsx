import { FlatList } from 'react-native'
import { Profile } from '../types'
import { ProfileCard } from './ProfileCard'

type Props = {
  profiles: Profile[]
  activeProfileId: string | null
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}

// The active profile is always listed first; the rest keep their original order.
function activeFirst(profiles: Profile[], activeProfileId: string | null): Profile[] {
  const active = profiles.find(p => p.id === activeProfileId)
  return active ? [active, ...profiles.filter(p => p !== active)] : profiles
}

export function ProfileList({ profiles, activeProfileId, onOpen, onDelete }: Props) {
  return (
    <FlatList
      data={activeFirst(profiles, activeProfileId)}
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
