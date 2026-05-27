import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useBlackjackStore } from '../../features/blackjack/store'
import { useProfileStore } from '../../features/profile/store'
import { TableSetup } from '../../features/blackjack/components/TableSetup'
import { Hand } from '../../features/blackjack/components/Hand'
import { ActionButtons } from '../../features/blackjack/components/ActionButtons'
import { BetControls } from '../../features/blackjack/components/BetControls'
import { TableRules } from '../../lib/types'
import { canDouble, canSplit, canSurrender } from '../../features/blackjack/engine'

export default function BlackjackScreen() {
  const router = useRouter()
  const [setupDone, setSetupDone] = useState(false)

  const store = useBlackjackStore()
  const { profiles, activeProfileId } = useProfileStore()
  const activeProfile = profiles.find(p => p.id === activeProfileId)
  const isInfinite = activeProfile?.bankrollMode === 'infinite'
  const balance = activeProfile
    ? isInfinite ? Infinity : activeProfile.balance
    : 0

  function handleStart(rules: TableRules) {
    store.setTableRules(rules)
    setSetupDone(true)
  }

  if (!setupDone) return <TableSetup onStart={handleStart} />

  const activeHand = store.playerHands[store.activeHandIndex] ?? []
  const rules = store.tableRules

  const rulePill = [
    rules.dealerSoft17,
    rules.continuousShuffle ? 'CSM' : `${rules.deckCount}D`,
    rules.payoutMode,
    rules.surrender === 'none' ? 'No Sur' : rules.surrender === 'late' ? 'LS' : 'ES',
  ].join(' · ')

  const isPlaying = store.phase === 'playing'
  const isResult = store.phase === 'result'
  const isBetting = store.phase === 'betting'

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.pill}>{rulePill}</Text>
        <TouchableOpacity onPress={store.toggleAssist}>
          <Text style={styles.assist}>Assist: {store.assistEnabled ? '●' : '○'}</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <Hand hand={store.dealerHand} label="Dealer" hideScore={store.phase === 'playing'} />
        {store.playerHands.map((hand, i) => (
          <Hand
            key={i}
            hand={hand}
            label={store.playerHands.length > 1 ? `Hand ${i + 1}` : 'You'}
            active={store.playerHands.length > 1 && i === store.activeHandIndex}
          />
        ))}
      </View>

      {/* Result banner */}
      {isResult && (
        <View style={styles.result}>
          <Text style={styles.resultText}>
            {store.lastOutcome === 'blackjack' ? '🃏 Blackjack!' :
             store.lastOutcome === 'win' ? 'You Win!' :
             store.lastOutcome === 'push' ? 'Push' :
             store.lastOutcome === 'bust' ? 'Bust' : 'Dealer Wins'}
            {'  '}
            {store.lastDelta >= 0 ? `+$${store.lastDelta}` : `-$${Math.abs(store.lastDelta)}`}
          </Text>
          <TouchableOpacity style={styles.nextBtn} onPress={store.newHand}>
            <Text style={styles.nextBtnText}>Next Hand</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action buttons (during playing phase) */}
      {isPlaying && (
        <ActionButtons
          suggestedAction={store.suggestedAction}
          canDouble={canDouble(activeHand, store.activeHandIndex > 0, rules)}
          canSplit={canSplit(activeHand)}
          canSurrender={canSurrender(activeHand, rules)}
          onHit={store.hit}
          onStand={store.stand}
          onDouble={store.doubleDown}
          onSplit={store.split}
          onSurrender={store.surrender}
        />
      )}

      {/* Bet controls (during betting phase) */}
      {isBetting && (
        <BetControls
          bet={store.bet}
          balance={isInfinite ? Infinity : (activeProfile?.balance ?? 0)}
          isInfinite={isInfinite}
          onPlaceBet={store.placeBet}
          onClearBet={store.clearBet}
          onDeal={store.deal}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Balance: {isInfinite ? '∞' : `$${activeProfile?.balance ?? 0}`}
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d5c2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, backgroundColor: '#0a4a24' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow: { color: '#fff', fontSize: 15, transform: [{ translateY: -1 }] },
  back: { color: '#fff', fontSize: 15 },
  pill: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  assist: { color: '#FFD700', fontSize: 15 },
  table: { flex: 1, justifyContent: 'space-around', paddingVertical: 16 },
  result: { backgroundColor: 'rgba(0,0,0,0.75)', padding: 20, margin: 12, borderRadius: 12, alignItems: 'center' },
  resultText: { color: '#FFD700', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  nextBtn: { backgroundColor: '#FFD700', paddingVertical: 10, paddingHorizontal: 32, borderRadius: 8 },
  nextBtnText: { fontWeight: '700', fontSize: 16 },
  footer: { padding: 12, backgroundColor: '#0a4a24', alignItems: 'flex-end' },
  footerText: { color: '#aaa', fontSize: 14 },
})
