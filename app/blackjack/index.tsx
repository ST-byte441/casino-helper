import { useState, useRef, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useBlackjackStore } from '../../features/blackjack/store'
import { useProfileStore } from '../../features/profile/store'
import { usePreferencesStore } from '../../features/preferences/store'
import { formatMoney } from '../../features/profile/format'
import { TableSetup } from '../../features/blackjack/components/TableSetup'
import { TableHeader } from '../../features/blackjack/components/table/TableHeader'
import { DealerArea } from '../../features/blackjack/components/table/DealerArea'
import { HandsArea } from '../../features/blackjack/components/table/HandsArea'
import { ResultBanner } from '../../features/blackjack/components/table/ResultBanner'
import { Controls } from '../../features/blackjack/components/table/Controls'
import { BalanceFooter } from '../../features/blackjack/components/table/BalanceFooter'
import { pickLayout } from '../../features/blackjack/layout'
import { useScreenClass } from '../../lib/useScreenClass'
import { TableRules } from '../../lib/types'
import { canDouble, canSplit, canSurrender, scoreHand } from '../../features/blackjack/engine'

export default function BlackjackScreen() {
  const router = useRouter()
  const [setupDone, setSetupDone] = useState(false)
  const { sizeClass, orientation } = useScreenClass()
  const layout = pickLayout(sizeClass, orientation)

  const store = useBlackjackStore()
  const { profiles, activeProfileId } = useProfileStore()
  const { blackjackRules: savedRules, saveBlackjackRules } = usePreferencesStore()
  const activeProfile = profiles.find(p => p.id === activeProfileId)
  const isInfinite = activeProfile?.bankrollMode === 'infinite'
  const balance = activeProfile
    ? isInfinite ? Infinity : activeProfile.balance
    : 0

  const [showFundsWarning, setFundsWarning] = useState(false)
  const fundsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function triggerFundsWarning() {
    setFundsWarning(true)
    clearTimeout(fundsTimer.current)
    fundsTimer.current = setTimeout(() => setFundsWarning(false), 2000)
  }

  // Leaving the table settles an unfinished hand and starts the next visit fresh.
  useEffect(() => () => {
    clearTimeout(fundsTimer.current)
    useBlackjackStore.getState().abandonHand()
  }, [])

  function handleStart(rules: TableRules) {
    saveBlackjackRules(rules)
    store.setTableRules(rules)
    setSetupDone(true)
  }

  if (!setupDone) return <TableSetup onStart={handleStart} initialRules={savedRules} />

  const activeHand = store.playerHands[store.activeHandIndex] ?? []
  const rules = store.tableRules

  const rulePill = [
    rules.dealerSoft17,
    rules.continuousShuffle ? 'CSM' : `${rules.deckCount}D`,
    rules.payoutMode,
    rules.surrender === 'none' ? 'No Sur' : rules.surrender === 'late' ? 'LS' : 'ES',
  ].join(' · ')

  const isResult = store.phase === 'result'

  function getHandStatus(i: number): 'bust' | 'stood' | undefined {
    if (i >= store.activeHandIndex) return undefined
    return scoreHand(store.playerHands[i]) > 21 ? 'bust' : 'stood'
  }

  const size = layout === 'phone' ? 'regular' : 'large'

  const header = (
    <TableHeader
      size={size}
      rulePill={rulePill}
      assistEnabled={store.assistEnabled}
      onBack={() => router.back()}
      onToggleAssist={store.toggleAssist}
    />
  )
  const dealer = <DealerArea size={size} hand={store.dealerHand} hideScore={store.phase === 'playing'} />
  const hands = (
    <HandsArea
      size={size}
      wrap={layout !== 'phone'}
      hands={store.playerHands}
      activeHandIndex={store.activeHandIndex}
      getHandStatus={getHandStatus}
    />
  )
  const result = isResult && (
    <ResultBanner size={size} outcome={store.lastOutcome} delta={store.lastDelta} onNext={store.newHand} />
  )
  const controls = (
    <Controls
      size={size}
      phase={store.phase}
      actions={{
        suggestedAction: store.suggestedAction,
        canDouble: canDouble(activeHand, store.activeHandIndex > 0, rules) && store.canAffordExtra(),
        canSplit: canSplit(activeHand) && store.canAffordExtra(),
        canSurrender: canSurrender(activeHand, rules) && store.playerHands.length === 1,
        onHit: store.hit,
        onStand: store.stand,
        onDouble: store.doubleDown,
        onSplit: store.split,
        onSurrender: store.surrender,
      }}
      betting={{
        bet: store.bet,
        balance: isInfinite ? Infinity : (activeProfile?.balance ?? 0),
        isInfinite,
        onPlaceBet: store.placeBet,
        onClearBet: store.clearBet,
        onDeal: store.deal,
        onInsufficientFunds: triggerFundsWarning,
      }}
    />
  )
  const footer = (
    <BalanceFooter
      size={size}
      balanceText={isInfinite ? '∞' : formatMoney(balance)}
      negative={balance < 0}
      showFundsWarning={showFundsWarning}
    />
  )

  if (layout === 'phone') {
    return (
      <SafeAreaView style={styles.container}>
        {header}
        {dealer}
        {hands}
        {result}
        {controls}
        {footer}
      </SafeAreaView>
    )
  }

  // Large portrait (and, until the landscape layout lands, large landscape): the phone order,
  // bigger, with the result and controls in a centred column so tablets don't stretch them.
  return (
    <SafeAreaView style={styles.container}>
      {header}
      {dealer}
      {hands}
      <View testID="bj-controls-column" style={styles.controlsColumn}>
        {result}
        {controls}
      </View>
      {footer}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d5c2e' },
  controlsColumn: { width: '100%', maxWidth: 520, alignSelf: 'center' },
})
