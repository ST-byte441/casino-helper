import React, { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useBaccaratStore } from '../../features/baccarat/store'
import { useProfileStore } from '../../features/profile/store'
import { usePreferencesStore } from '../../features/preferences/store'
import { HandDisplay } from '../../features/baccarat/components/HandDisplay'
import { BetPanel } from '../../features/baccarat/components/BetPanel'
import { ResultBanner } from '../../features/baccarat/components/ResultBanner'
import { SqueezeCard } from '../../features/baccarat/components/SqueezeCard'
import { scoreHand } from '../../features/baccarat/engine'
import { handView } from '../../features/baccarat/reveal'
import { BaccaratBet } from '../../lib/types'

export default function BaccaratScreen() {
  const router = useRouter()
  const store = useBaccaratStore()
  const { profiles, activeProfileId } = useProfileStore()
  const { baccaratRevealMode, setBaccaratRevealMode } = usePreferencesStore()
  const active = profiles.find(p => p.id === activeProfileId)
  const isInfinite = active?.bankrollMode === 'infinite'
  const numericBalance = isInfinite ? Infinity : (active?.balance ?? 0)
  const balance = active ? (isInfinite ? '∞' : `$${active.balance}`) : '—'

  const [showFundsWarning, setFundsWarning] = useState(false)
  const fundsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const tableRef = useRef<ScrollView>(null)

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
  const hasBets = Object.values(store.bets).some(v => v && v > 0)
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

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>BACCARAT</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            disabled={isRevealing}
            style={isRevealing && styles.toggleDisabled}
            onPress={() => setBaccaratRevealMode(baccaratRevealMode === 'squeeze' ? 'flip' : 'squeeze')}
          >
            <Text style={[styles.assist, baccaratRevealMode === 'squeeze' && styles.assistOn]}>
              {baccaratRevealMode === 'squeeze' ? 'Squeeze' : 'Flip'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={store.toggleAssist}>
            <Text style={[styles.assist, store.assistEnabled && styles.assistOn]}>
              Assist {store.assistEnabled ? '●' : '○'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        testID="baccarat-table"
        style={styles.table}
        contentContainerStyle={styles.tableContent}
        ref={tableRef}
        // The squeeze card's pan blocks this scroll (see SqueezeCard scrollRef), so a drag on
        // the card peels it while the rest of the table still scrolls on short screens.
        bounces={!isSqueezing}
      >
        {isBetting ? (
          <Text style={styles.waiting}>Place your bets</Text>
        ) : (
          <>
            <HandDisplay
              hand={store.bankerHand}
              label="Banker"
              {...bankerView}
              highlight={isResult && outcome === 'banker'}
            />
            <View style={styles.divider} />
            <HandDisplay
              hand={store.playerHand}
              label="Player"
              {...playerView}
              highlight={isResult && outcome === 'player'}
            />
            {isRevealing && currentCard && (
              <SqueezeCard
                key={store.revealedCount}
                card={currentCard}
                mode={store.handRevealMode}
                onRevealed={store.revealNext}
                scrollRef={tableRef}
              />
            )}
            {isResult && outcome && (
              <ResultBanner
                outcome={outcome}
                playerScore={scoreHand(store.playerHand)}
                bankerScore={scoreHand(store.bankerHand)}
                netDelta={store.lastNetDelta}
              />
            )}
          </>
        )}
      </ScrollView>

      {isBetting && (
        <View style={styles.betArea}>
          <BetPanel
            bets={store.bets}
            assistEnabled={store.assistEnabled}
            disabled={false}
            onAdd={handlePlaceBet}
            onClear={store.clearBets}
          />
        </View>
      )}

      <View style={styles.footer}>
        <View>
          {showFundsWarning && <Text style={styles.fundsWarning}>Insufficient funds</Text>}
          <Text style={styles.balance}>Balance: {balance}</Text>
        </View>
        {isResult && (
          <TouchableOpacity style={styles.dealBtn} onPress={store.newHand}>
            <Text style={styles.dealText}>Next Hand</Text>
          </TouchableOpacity>
        )}
        {isBetting && (
          <TouchableOpacity
            style={[styles.dealBtn, !hasBets && styles.dealDisabled]}
            disabled={!hasBets}
            onPress={() => store.deal(baccaratRevealMode)}
          >
            <Text style={styles.dealText}>DEAL</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  back: { color: '#aaa', fontSize: 15 },
  title: { color: '#FFD700', fontWeight: '700', fontSize: 15 },
  assist: { color: '#aaa', fontSize: 13 },
  assistOn: { color: '#FFD700' },
  toggleDisabled: { opacity: 0.4 },
  table: { flex: 1, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  tableContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 16 },
  divider: { height: 1, backgroundColor: '#2a2a3e', marginHorizontal: 32, marginVertical: 8 },
  waiting: { color: '#555', fontSize: 16, textAlign: 'center' },
  betArea: { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  footer: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 80 },
  balance: { color: '#aaa', fontSize: 14 },
  fundsWarning: { color: '#e74c3c', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  dealBtn: { backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14 },
  dealDisabled: { opacity: 0.4 },
  dealText: { color: '#13131f', fontWeight: '800', fontSize: 16 },
})
