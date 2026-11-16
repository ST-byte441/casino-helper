import React, { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCrapsStore } from '../../features/craps/store'
import { usePreferencesStore } from '../../features/preferences/store'
import { TableSetup } from '../../features/craps/components/TableSetup'
import { CrapsListView } from '../../features/craps/components/list/CrapsListView'
import { CrapsTable } from '../../features/craps/components/table/CrapsTable'
import { useOrientationStore } from '../../lib/orientation'
import { useScreenClass } from '../../lib/useScreenClass'
import { Orientation, SizeClass } from '../../lib/screenClass'

/** Phones in portrait get the bet list; phones in landscape (Fold cover too) and large screens get the table. */
export function pickCrapsView(sizeClass: SizeClass, orientation: Orientation): 'list' | 'table' {
  return sizeClass !== 'large' && orientation === 'portrait' ? 'list' : 'table'
}

const roll = () => useCrapsStore.getState().roll()

export default function CrapsScreen() {
  const phase = useCrapsStore(s => s.phase)
  const setTableRules = useCrapsStore(s => s.setTableRules)
  const { crapsRules: savedRules, saveCrapsRules } = usePreferencesStore()
  const { sizeClass, orientation } = useScreenClass()
  const setupDone = phase !== 'setup'

  // The root layout owns the orientation lock (lib/orientation.ts); once set up, the phone may rotate to the table.
  useEffect(() => {
    if (setupDone) useOrientationStore.getState().setRotationRequested(true)
  }, [setupDone])

  // Leaving withdraws the rotation request and starts the next visit at setup.
  useEffect(() => () => {
    useOrientationStore.getState().setRotationRequested(false)
    useCrapsStore.getState().resetToSetup()
  }, [])

  if (!setupDone) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#13131f' }}>
        <TableSetup rules={savedRules} onConfirm={rules => { saveCrapsRules(rules); setTableRules(rules) }} />
      </SafeAreaView>
    )
  }

  if (pickCrapsView(sizeClass, orientation) === 'list') return <CrapsListView />

  // Bets, point and the selected chip live in the store, so a rotation only remounts the view. Keyed on
  // orientation so a large screen's rotation remounts the table too, which cancels an in-progress drag.
  return (
    <SafeAreaView style={styles.root}>
      <CrapsTable key={orientation} size={sizeClass === 'large' ? 'large' : 'regular'} orientation={orientation}
        onRoll={roll} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#13131f' },
})
