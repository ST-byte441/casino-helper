import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { checkForUpdate, UpdateInfo } from '../lib/updates'
import UpdateModal from '../components/UpdateModal'

export default function RootLayout() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    checkForUpdate().then(info => {
      if (info?.hasUpdate) setUpdateInfo(info)
    })
  }, [])

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="blackjack/index" options={{ headerShown: false }} />
      </Stack>
      {updateInfo && (
        <UpdateModal
          currentVersion={updateInfo.currentVersion}
          latestVersion={updateInfo.latestVersion}
          releaseUrl={updateInfo.releaseUrl}
          onDismiss={() => setUpdateInfo(null)}
        />
      )}
    </>
  )
}
