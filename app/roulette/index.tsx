import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useRouletteStore } from '../../features/roulette/store'
import { useProfileStore } from '../../features/profile/store'
import { usePreferencesStore } from '../../features/preferences/store'
import { formatMoney } from '../../features/profile/format'
import { RouletteSetup } from '../../features/roulette/components/RouletteSetup'
import { BettingTable } from '../../features/roulette/components/BettingTable'
import { ResultPanel } from '../../features/roulette/components/ResultPanel'
import { Wheel } from '../../features/roulette/components/Wheel'
import { BoardOrientation } from '../../features/roulette/layout'
import { RouletteSettings, RouletteSpeed, RouletteWheel } from '../../lib/types'

const WHEEL_LABEL: Record<RouletteWheel, string> = {
  single: 'Single zero',
  double: 'Double zero',
  triple: 'Triple zero',
}
const SPEED_LABEL: Record<RouletteSpeed, string> = { slow: 'Slow', fast: 'Fast' }

const noop = () => {}

export default function RouletteScreen() {
  const router = useRouter()
  const [setupDone, setSetupDone] = useState(false)

  const store = useRouletteStore()
  const { profiles, activeProfileId } = useProfileStore()
  const { rouletteSettings, saveRouletteSettings } = usePreferencesStore()
  const active = profiles.find(p => p.id === activeProfileId)
  const isInfinite = active?.bankrollMode === 'infinite'
  const balance = active ? (isInfinite ? '∞' : formatMoney(active.balance)) : '—'
  const isNegative = !!active && !isInfinite && active.balance < 0

  const { width, height } = useWindowDimensions()
  const orientation: BoardOrientation = width > height ? 'landscape' : 'portrait'

  // The app is locked to portrait in app/_layout.tsx; the table follows the phone while it is open.
  useEffect(() => {
    if (setupDone) ScreenOrientation.unlockAsync().catch(noop)
  }, [setupDone])

  // Leaving relocks portrait, settles a spin in flight and starts the next visit fresh.
  useEffect(() => () => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(noop)
    useRouletteStore.getState().abandon()
  }, [])

  function handleStart(s: RouletteSettings) {
    saveRouletteSettings(s)
    store.setSettings(s)
    setSetupDone(true)
  }

  if (!setupDone) return <RouletteSetup initial={rouletteSettings} onStart={handleStart} />

  const { settings, phase, result } = store
  const pill = `${WHEEL_LABEL[settings.wheel]} · ${SPEED_LABEL[settings.speed]}`

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.pill}>{pill}</Text>
        <Text style={[styles.balance, isNegative && styles.negative]}>{balance}</Text>
      </View>

      {phase === 'betting' && (
        // Keyed on orientation: a rotation remounts the table, which cancels an in-progress drag.
        <BettingTable key={orientation} wheel={settings.wheel} orientation={orientation} onSpin={() => store.spin()} />
      )}

      {phase !== 'betting' && result !== null && (
        <View style={styles.wheelArea}>
          {phase === 'spinning' ? (
            <Wheel key="spinning" wheel={settings.wheel} result={result} speed={settings.speed} onDone={store.finishSpin} />
          ) : (
            // A fresh instance: `frozen` only applies at mount.
            <Wheel key="frozen" wheel={settings.wheel} result={result} speed={settings.speed} onDone={noop} frozen />
          )}
        </View>
      )}

      {phase === 'result' && result !== null && (
        <ResultPanel result={result} net={store.lastNet} onBack={store.backToTable} />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  back: { color: '#fff', fontSize: 15 },
  pill: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  balance: { color: '#FFD700', fontSize: 15, fontWeight: '700' },
  negative: { color: '#ff5555' },
  // Flex-bounded so the wheel's onLayout sizing grows and shrinks with rotation.
  wheelArea: { flex: 1, padding: 12 },
})
