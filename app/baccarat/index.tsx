import React, { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useBaccaratStore } from '../../features/baccarat/store'
import { useProfileStore } from '../../features/profile/store'
import { HandDisplay } from '../../features/baccarat/components/HandDisplay'
import { BetPanel } from '../../features/baccarat/components/BetPanel'
import { ResultBanner } from '../../features/baccarat/components/ResultBanner'
import { BaccaratBet } from '../../lib/types'

export default function BaccaratScreen() {
  const router = useRouter()
  const store = useBaccaratStore()
  const { profiles, activeProfileId } = useProfileStore()
  const active = profiles.find(p => p.id === activeProfileId)
  const isInfinite = active?.bankrollMode === 'infinite'
  const numericBalance = isInfinite ? Infinity : (active?.balance ?? 0)
  const balance = active ? (isInfinite ? '∞' : `$${active.balance}`) : '—'

  const [showFundsWarning, setFundsWarning] = useState(false)
  const fundsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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

  const hasBets = Object.values(store.bets).some(v => v && v > 0)
  const isResult = store.phase === 'result'

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>BACCARAT</Text>
        <TouchableOpacity onPress={store.toggleAssist}>
          <Text style={[styles.assist, store.assistEnabled && styles.assistOn]}>
            Assist {store.assistEnabled ? '●' : '○'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.table}>
        {isResult ? (
          <>
            <HandDisplay hand={store.bankerHand} label="Banker" />
            <View style={styles.divider} />
            <HandDisplay hand={store.playerHand} label="Player" />
          </>
        ) : (
          <Text style={styles.waiting}>Place your bets</Text>
        )}
      </View>

      <View style={styles.betArea}>
        <BetPanel
          bets={store.bets}
          assistEnabled={store.assistEnabled}
          disabled={isResult}
          onAdd={handlePlaceBet}
          onClear={store.clearBets}
        />
      </View>

      <View style={styles.footer}>
        <View>
          {showFundsWarning && <Text style={styles.fundsWarning}>Insufficient funds</Text>}
          <Text style={styles.balance}>Balance: {balance}</Text>
        </View>
        {isResult ? (
          <TouchableOpacity style={styles.dealBtn} onPress={store.newHand}>
            <Text style={styles.dealText}>Next Hand</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.dealBtn, !hasBets && styles.dealDisabled]}
            disabled={!hasBets}
            onPress={() => store.deal('flip')}
          >
            <Text style={styles.dealText}>DEAL</Text>
          </TouchableOpacity>
        )}
      </View>

      {isResult && store.lastOutcome && (
        <ResultBanner
          outcome={store.lastOutcome}
          netDelta={store.lastNetDelta}
          onDismiss={store.newHand}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  back: { color: '#aaa', fontSize: 15 },
  title: { color: '#FFD700', fontWeight: '700', fontSize: 15 },
  assist: { color: '#aaa', fontSize: 13 },
  assistOn: { color: '#FFD700' },
  table: { flex: 1, justifyContent: 'center', paddingVertical: 16,
    borderBottomWidth: 1, borderColor: '#2a2a3e' },
  divider: { height: 1, backgroundColor: '#2a2a3e', marginHorizontal: 32, marginVertical: 8 },
  waiting: { color: '#555', fontSize: 16, textAlign: 'center' },
  betArea: { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  footer: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balance: { color: '#aaa', fontSize: 14 },
  fundsWarning: { color: '#e74c3c', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  dealBtn: { backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14 },
  dealDisabled: { opacity: 0.4 },
  dealText: { color: '#13131f', fontWeight: '800', fontSize: 16 },
})
