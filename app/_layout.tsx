import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import Constants from 'expo-constants'
import { checkForUpdate, UpdateInfo } from '../lib/updates'
import UpdateModal from '../components/UpdateModal'

export default function RootLayout() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    checkForUpdate().then(info => {
      if (info?.hasUpdate) setUpdateInfo(info)
    })
  }, [])

  const currentVersion = Constants.expoConfig?.version ?? '0.0.0'

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="blackjack/index" options={{ headerShown: false }} />
      </Stack>
      {updateInfo && (
        <UpdateModal
          currentVersion={currentVersion}
          latestVersion={updateInfo.latestVersion}
          releaseUrl={updateInfo.releaseUrl}
          onDismiss={() => setUpdateInfo(null)}
        />
      )}
    </>
  )
}
