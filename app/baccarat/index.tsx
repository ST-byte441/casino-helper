import React, { useState, useRef, useEffect } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Text } from '../../components/Text'
import { LegacyScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useBaccaratStore } from '../../features/baccarat/store'
import { useProfileStore } from '../../features/profile/store'
import { formatMoney } from '../../features/profile/format'
import { usePreferencesStore } from '../../features/preferences/store'
import { BetPanel } from '../../features/baccarat/components/BetPanel'
import { TableHeader } from '../../features/baccarat/components/table/TableHeader'
import { HandsArea } from '../../features/baccarat/components/table/HandsArea'
import { RevealArea } from '../../features/baccarat/components/table/RevealArea'
import { Footer } from '../../features/baccarat/components/table/Footer'
import { PANEL_WIDTH } from '../../features/baccarat/components/table/landscape'
import { pickLayout } from '../../lib/tableLayout'
import { TableSize } from '../../lib/tableSize'
import { useScreenClass } from '../../lib/useScreenClass'
import { scoreHand, meetsTableMinimum } from '../../features/baccarat/engine'
import { handView } from '../../features/baccarat/reveal'
import { BaccaratBet } from '../../lib/types'
import { BACCARAT_CHIPS, BACCARAT_SIDE_CHIPS, BACCARAT_MIN_MAIN_BET } from '../../lib/constants'

export default function BaccaratScreen() {
  const router = useRouter()
  const { sizeClass, orientation } = useScreenClass()
  const layout = pickLayout(sizeClass, orientation)
  const size: TableSize = layout === 'phone' ? 'regular' : 'large'
  const store = useBaccaratStore()
  const { profiles, activeProfileId } = useProfileStore()
  const { baccaratRevealMode, setBaccaratRevealMode } = usePreferencesStore()
  const active = profiles.find(p => p.id === activeProfileId)
  const isInfinite = active?.bankrollMode === 'infinite'
  const numericBalance = isInfinite ? Infinity : (active?.balance ?? 0)
  const balance = active ? (isInfinite ? '∞' : formatMoney(active.balance)) : '—'

  const [showFundsWarning, setFundsWarning] = useState(false)
  const [mainChip, setMainChip] = useState<number>(BACCARAT_CHIPS[0])
  const [sideChip, setSideChip] = useState<number>(BACCARAT_SIDE_CHIPS[1])
  const fundsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const tableRef = useRef<React.ComponentRef<typeof LegacyScrollView>>(null)

  // Leaving the table settles an unfinished hand and starts the next visit fresh.
  useEffect(() => () => {
    clearTimeout(fundsTimer.current)
    useBaccaratStore.getState().abandonHand()
  }, [])

  function triggerFundsWarning() {
    setFundsWarning(true)
    clearTimeout(fundsTimer.current)
    fundsTimer.current = setTimeout(() => setFundsWarning(false), 2000)
  }

  function handlePlaceBet(bet: BaccaratBet, amount: number) {
    const totalBets = Object.values(store.bets).reduce((s, v) => s + (v ?? 0), 0)
    if (!isInfinite && totalBets + amount > numericBalance) {
      triggerFundsWarning()
      return
    }
    store.placeBet(bet, amount)
  }

  const { phase } = store
  const canDeal = meetsTableMinimum(store.bets)
  const isRevealing = phase === 'revealing'
  const isResult = phase === 'result'
  const isBetting = phase === 'betting'

  const playerView = isRevealing ? handView(store.revealOrder, store.revealedCount, 'player') : {}
  const bankerView = isRevealing ? handView(store.revealOrder, store.revealedCount, 'banker') : {}
  const step = isRevealing ? store.revealOrder[store.revealedCount] : undefined
  const currentCard = step
    ? (step.side === 'player' ? store.playerHand : store.bankerHand)[step.index]
    : undefined
  const outcome = store.lastOutcome
  const isSqueezing = isRevealing && store.handRevealMode === 'squeeze'
  const squeezeOn = baccaratRevealMode === 'squeeze'

  const header = (
    <TableHeader
      size={size}
      squeezeOn={squeezeOn}
      locked={isRevealing}
      onBack={() => router.back()}
      onToggleSqueeze={() => setBaccaratRevealMode(squeezeOn ? 'flip' : 'squeeze')}
    />
  )
  const hands = (arrangement: 'stack' | 'sideBySide') => (
    <HandsArea
      size={size}
      cardSize={arrangement === 'sideBySide' ? 'medium' : size}
      arrangement={arrangement}
      banker={{ hand: store.bankerHand, ...bankerView, highlight: isResult && outcome === 'banker' }}
      player={{ hand: store.playerHand, ...playerView, highlight: isResult && outcome === 'player' }}
    />
  )
  const reveal = (
    <RevealArea
      size={size}
      reveal={isRevealing && currentCard ? {
        card: currentCard, key: store.revealedCount, mode: store.handRevealMode,
        onRevealed: store.revealNext, scrollRef: tableRef,
      } : undefined}
      result={isResult && outcome ? {
        outcome, playerScore: scoreHand(store.playerHand), bankerScore: scoreHand(store.bankerHand),
        netDelta: store.lastNetDelta,
      } : undefined}
    />
  )
  const table = (arrangement: 'stack' | 'sideBySide') => (
    <LegacyScrollView
      testID="baccarat-table"
      style={styles.table}
      contentContainerStyle={styles.tableContent}
      ref={tableRef}
      // The squeeze card's pan blocks this scroll (see SqueezeCard scrollRef), so a drag on
      // the card peels it while the rest of the table still scrolls on short screens.
      bounces={!isSqueezing}
      // Large screens: the stacked big hands plus the 280dp squeeze card can be taller than the felt, and
      // the card's bottom edge (where the peel starts) and Flip it would sit below the fold. Scroll to the
      // card whenever the reveal content grows. Phones fit, and keep the original felt (no handler).
      {...(size === 'large' && isRevealing
        ? { onContentSizeChange: () => tableRef.current?.scrollToEnd({ animated: true }) }
        : {})}
    >
      {isBetting ? (
        <Text style={size === 'large' ? [styles.waiting, styles.waitingLarge] : styles.waiting}>Place your bets</Text>
      ) : (
        <>
          {hands(arrangement)}
          {reveal}
        </>
      )}
    </LegacyScrollView>
  )
  const betPanel = (
    <BetPanel
      bets={store.bets}
      assistEnabled={false}
      disabled={false}
      mainChip={mainChip}
      sideChip={sideChip}
      onMainChipChange={setMainChip}
      onSideChipChange={setSideChip}
      onAdd={handlePlaceBet}
      onClear={store.clearBets}
      size={size}
    />
  )
  const footerProps = {
    size,
    showFundsWarning,
    minBet: isBetting && !canDeal ? BACCARAT_MIN_MAIN_BET : null,
    balanceText: balance,
    negative: numericBalance < 0,
    action: isResult ? { label: 'Next Hand' as const, disabled: false, onPress: store.newHand }
      : isBetting ? { label: 'DEAL' as const, disabled: !canDeal, onPress: () => store.deal(baccaratRevealMode) }
      : null,
  }

  if (layout === 'phone') {
    return (
      <SafeAreaView style={styles.root}>
        {header}
        {table('stack')}
        {isBetting && <View style={styles.betArea}>{betPanel}</View>}
        <Footer {...footerProps} />
      </SafeAreaView>
    )
  }

  if (layout === 'largeLandscape') {
    // Felt on the left: Banker | Player side by side, the squeeze card or result below. The side panel
    // on the right holds the bets, DEAL / Next Hand and the balance (pinned to its bottom; it scrolls
    // when the font is scaled up).
    return (
      <SafeAreaView style={styles.root}>
        {header}
        <View style={styles.landscapeRow}>
          {table('sideBySide')}
          <ScrollView testID="bac-panel" style={styles.panel} contentContainerStyle={styles.panelContent}>
            {isBetting && betPanel}
            <Footer {...footerProps} variant="panel" />
          </ScrollView>
        </View>
      </SafeAreaView>
    )
  }

  // Large portrait: the phone order, bigger, with the bets and footer in a centred column so
  // tablets don't stretch the chips and buttons.
  return (
    <SafeAreaView style={styles.root}>
      {header}
      {table('stack')}
      <View testID="bac-controls-column" style={styles.controlsColumn}>
        {isBetting && <View style={styles.betArea}>{betPanel}</View>}
        <Footer {...footerProps} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#13131f' },
  table: { flex: 1, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  tableContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 16 },
  waiting: { color: '#555', fontSize: 16, textAlign: 'center' },
  waitingLarge: { fontSize: 22 },
  betArea: { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  controlsColumn: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  landscapeRow: { flex: 1, flexDirection: 'row' },
  panel: { width: PANEL_WIDTH, flexGrow: 0, backgroundColor: '#0f0f1a', borderLeftWidth: 1, borderColor: '#2a2a3e' },
  panelContent: { flexGrow: 1, paddingVertical: 8 },
})
