import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Stack } from 'expo-router'
import * as ScreenOrientation from 'expo-screen-orientation'
import { checkForUpdate, UpdateInfo } from '../lib/updates'
import UpdateModal from '../components/UpdateModal'

export default function RootLayout() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  // The app is portrait-only; the roulette table unlocks rotation while it is open.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {})
  }, [])

  useEffect(() => {
    checkForUpdate().then(info => {
      if (info?.hasUpdate) setUpdateInfo(info)
    })
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#13131f' }}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#13131f' }, animation: 'none' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="blackjack/index" options={{ headerShown: false }} />
        <Stack.Screen name="sandbox/blackjack" options={{ headerShown: false }} />
        <Stack.Screen name="baccarat/index" options={{ headerShown: false }} />
        <Stack.Screen name="sandbox/baccarat" options={{ headerShown: false }} />
        <Stack.Screen name="craps/index" options={{ headerShown: false }} />
        <Stack.Screen name="roulette/index" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
      </Stack>
      {updateInfo && (
        <UpdateModal
          currentVersion={updateInfo.currentVersion}
          latestVersion={updateInfo.latestVersion}
          releaseUrl={updateInfo.releaseUrl}
          onDismiss={() => setUpdateInfo(null)}
        />
      )}
    </GestureHandlerRootView>
  )
}
