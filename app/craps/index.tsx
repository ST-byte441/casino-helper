import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useCrapsStore } from '../../features/craps/store'
import { useProfileStore } from '../../features/profile/store'
import { getBetQuality } from '../../features/craps/strategy'
import { isValidBetForVariant, isValidBetForPhase, suggestedBetIncrement, getMaxOdds } from '../../features/craps/engine'
import { TableSetup } from '../../features/craps/components/TableSetup'
import { DiceDisplay } from '../../features/craps/components/DiceDisplay'
import { BetCategoryPanel } from '../../features/craps/components/BetCategoryPanel'
import { BetRow } from '../../features/craps/components/BetRow'
import { OddsRow } from '../../features/craps/components/OddsRow'
import { HopBetGrid } from '../../features/craps/components/HopBetGrid'
import { RollButton } from '../../features/craps/components/RollButton'
import { RollResultBanner } from '../../features/craps/components/RollResultBanner'
import { CrapsTableRules, BetType } from '../../lib/types'

export default function CrapsScreen() {
  const router = useRouter()
  const store = useCrapsStore()
  const { profiles, activeProfileId } = useProfileStore()
  const active = profiles.find(p => p.id === activeProfileId)
  const balance = active ? (active.bankrollMode === 'infinite' ? '∞' : `$${active.balance}`) : '—'

  const [showBanner, setShowBanner] = useState(false)

  const { phase, dice, point, bets, tableRules, assistEnabled, lastRoll, lastDelta } = store

  if (phase === 'setup') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#13131f' }}>
        <TableSetup rules={tableRules} onConfirm={rules => store.setTableRules(rules)} />
      </SafeAreaView>
    )
  }

  const variant = tableRules.variant
  const passBet = bets.find(b => b.type === 'pass')
  const dontPassBet = bets.find(b => b.type === 'dont-pass')

  function handleRoll() {
    store.roll()
    setShowBanner(true)
  }

  function getQuality(type: BetType, number?: number) {
    if (!assistEnabled) return null
    const bet = bets.find(b => b.type === type && (number == null || b.number === number))
    const hasOdds = (bet?.odds ?? 0) > 0
    const maxOdds = passBet && point ? getMaxOdds(passBet.amount, point, tableRules.oddsMultiple) : 0
    const oddsAtMax = hasOdds && (bet?.odds ?? 0) >= maxOdds
    return getBetQuality(type, hasOdds, oddsAtMax, number)
  }

  function betAmount(type: string, number?: number) {
    return bets.filter(b => b.type === type && (number == null || b.number === number)).reduce((s, b) => s + b.amount, 0)
  }

  function addBet(type: BetType, num?: number, amount?: number) {
    store.placeBet(type, amount ?? suggestedBetIncrement(type, num), num)
  }

  // Returns the delta from the last roll for a specific bet (used for place bet win indicators)
  function lastWinDelta(type: BetType, number?: number): number | undefined {
    if (!showBanner || !lastRoll) return undefined
    const bet = bets.find(b => b.type === type && (number == null || b.number === number))
    if (!bet) return undefined
    const outcome = lastRoll.outcomes.find(o => o.betId === bet.id)
    return outcome?.result === 'win' ? outcome.delta : undefined
  }

  // True when the odds amount produces a whole-dollar payout at the point's true-odds rate
  function isCleanOdds(oddsAmt: number, pt: number): boolean {
    if (oddsAmt === 0) return false
    if (pt === 6 || pt === 8) return oddsAmt % 5 === 0  // 6:5 — needs multiples of 5
    if (pt === 5 || pt === 9) return oddsAmt % 2 === 0  // 3:2 — needs multiples of 2
    return true                                          // 4/10: 2:1 — always clean
  }

  function removeBet(type: BetType, num?: number) {
    const bet = bets.find(b => b.type === type && (num == null || b.number === num))
    if (bet) store.removeBet(bet.id)
  }

  const placeNumbers = variant === 'craps' ? [4, 5, 6, 8, 9, 10] : [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]
  const hardwayNumbers = [4, 6, 8, 10]


  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CRAPS · {tableRules.oddsMultiple}</Text>
        <TouchableOpacity onPress={store.toggleAssist}>
          <Text style={[styles.assist, assistEnabled && styles.assistOn]}>Assist {assistEnabled ? '●' : '○'}</Text>
        </TouchableOpacity>
      </View>

      <DiceDisplay dice={dice} point={point} />

      <ScrollView style={styles.scroll}>
        {isValidBetForVariant('pass', variant) && (
          <BetCategoryPanel
            title="Pass Line"
            totalWagered={betAmount('pass') + (passBet?.odds ?? 0)}
            defaultExpanded
            quality={getQuality('pass')}
          >
            <BetRow
              label="Pass Line"
              amount={betAmount('pass')}
              increment={1}
              increments={[1, 5, 10]}
              disabled={!isValidBetForPhase('pass', phase)}
              quality={getQuality('pass')}
              onAdd={(amt) => addBet('pass', undefined, amt)}
              onRemove={() => removeBet('pass')}
            />
            {passBet && point && (
              <OddsRow
                odds={passBet.odds ?? 0}
                maxOdds={getMaxOdds(passBet.amount, point, tableRules.oddsMultiple)}
                increments={[1, 5, 10]}
                quality={assistEnabled && isCleanOdds(passBet.odds ?? 0, point) ? 'optimal' : null}
                onAdd={amt => store.addOdds(passBet.id, amt)}
                onRemove={amt => store.addOdds(passBet.id, -Math.min(amt, passBet.odds ?? 0))}
              />
            )}
          </BetCategoryPanel>
        )}

        {isValidBetForVariant('dont-pass', variant) && (
          <BetCategoryPanel title="Don't Pass" totalWagered={betAmount('dont-pass')} quality={getQuality('dont-pass')}>
            <BetRow
              label="Don't Pass"
              amount={betAmount('dont-pass')}
              increment={1}
              disabled={!isValidBetForPhase('dont-pass', phase)}
              quality={getQuality('dont-pass')}
              onAdd={() => addBet('dont-pass')}
              onRemove={() => removeBet('dont-pass')}
            />
            {dontPassBet && point && (
              <OddsRow
                odds={dontPassBet.odds ?? 0}
                maxOdds={getMaxOdds(dontPassBet.amount, point, tableRules.oddsMultiple)}
                increments={[1, 5, 10]}
                quality={assistEnabled && isCleanOdds(dontPassBet.odds ?? 0, point) ? 'optimal' : null}
                onAdd={amt => store.addOdds(dontPassBet.id, amt)}
                onRemove={amt => store.addOdds(dontPassBet.id, -Math.min(amt, dontPassBet.odds ?? 0))}
              />
            )}
          </BetCategoryPanel>
        )}

        {isValidBetForVariant('come', variant) && (
          <BetCategoryPanel title="Come" totalWagered={betAmount('come')} quality={getQuality('come')}>
            <BetRow
              label="Come"
              amount={betAmount('come')}
              increment={1}
              quality={getQuality('come')}
              onAdd={() => addBet('come')}
              onRemove={() => removeBet('come')}
            />
          </BetCategoryPanel>
        )}

        <BetCategoryPanel
          title="Place Bets"
          totalWagered={placeNumbers.reduce((s, n) => s + betAmount('place', n), 0)}
        >
          {placeNumbers.map(n => {
            const placeBet = bets.find(b => b.type === 'place' && b.number === n)
            return (
              <BetRow
                key={n}
                label={`Place ${n}`}
                amount={betAmount('place', n)}
                increment={suggestedBetIncrement('place', n)}
                showWorking={phase === 'come-out' && !!placeBet}
                working={placeBet?.working}
                quality={assistEnabled ? getBetQuality('place', false, false, n) : null}
                winDelta={lastWinDelta('place', n)}
                onAdd={() => store.placeBet('place', suggestedBetIncrement('place', n), n)}
                onRemove={() => removeBet('place', n)}
                onToggleWorking={() => placeBet && store.toggleWorking(placeBet.id)}
              />
            )
          })}
        </BetCategoryPanel>

        <BetCategoryPanel title="Field" totalWagered={betAmount('field')} quality={getQuality('field')}>
          <BetRow
            label={`Field (2=2:1, 12=${tableRules.fieldPays3on12 ? '3' : '2'}:1)`}
            amount={betAmount('field')}
            increment={1}
            quality={getQuality('field')}
            onAdd={() => addBet('field')}
            onRemove={() => removeBet('field')}
          />
          {variant === 'easy' && (
            <>
              <BetRow label="Low Field (2,3,4 = 2:1)" amount={betAmount('low-field')} increment={1} quality={assistEnabled ? getBetQuality('low-field', false, false) : null} onAdd={() => addBet('low-field')} onRemove={() => removeBet('low-field')} />
              <BetRow label="High Field (10,11,12 = 3:1)" amount={betAmount('high-field')} increment={1} quality={assistEnabled ? getBetQuality('high-field', false, false) : null} onAdd={() => addBet('high-field')} onRemove={() => removeBet('high-field')} />
            </>
          )}
        </BetCategoryPanel>

        <BetCategoryPanel title="Hardways" totalWagered={hardwayNumbers.reduce((s, n) => s + betAmount('hardway', n), 0)}>
          {hardwayNumbers.map(n => (
            <BetRow
              key={n}
              label={`Hard ${n} (${n === 6 || n === 8 ? '9' : '7'}:1)`}
              amount={betAmount('hardway', n)}
              increment={1}
              quality={assistEnabled ? getBetQuality('hardway', false, false) : null}
              onAdd={() => store.placeBet('hardway', 1, n)}
              onRemove={() => removeBet('hardway', n)}
            />
          ))}
        </BetCategoryPanel>

        <BetCategoryPanel
          title="Proposition Bets"
          totalWagered={(['any-7','any-craps','craps-2','craps-3','yo-11','craps-12','hi-lo','ce','horn','world'] as BetType[]).reduce((s, t) => s + betAmount(t), 0)}
        >
          {([
            ['any-7', 'Any 7 (4:1)'],
            ['any-craps', 'Any Craps (7:1)'],
            ['craps-2', 'Craps 2 (30:1)'],
            ['craps-3', 'Craps 3 (15:1)'],
            ['yo-11', 'Yo 11 (15:1)'],
            ['craps-12', 'Craps 12 (30:1)'],
            ['hi-lo', 'Hi-Lo (15:1)'],
            ['ce', 'C&E (3:1 / 7:1)'],
            ['horn', 'Horn ($4 unit)'],
            ['world', 'World ($5 unit)'],
          ] as [BetType, string][]).map(([type, label]) => (
            <BetRow
              key={type}
              label={label}
              amount={betAmount(type)}
              increment={suggestedBetIncrement(type)}
              quality={assistEnabled ? getBetQuality(type, false, false) : null}
              onAdd={() => addBet(type)}
              onRemove={() => removeBet(type)}
            />
          ))}
          <HopBetGrid
            increment={1}
            onPlace={(hopDice, isHard) => store.placeBet(isHard ? 'hop-hard' : 'hop-easy', 1, undefined, hopDice)}
          />
        </BetCategoryPanel>

        {isValidBetForVariant('buy', variant) && (
          <BetCategoryPanel title="Buy / Lay" totalWagered={placeNumbers.reduce((s, n) => s + betAmount('buy', n) + betAmount('lay', n), 0)}>
            {placeNumbers.map(n => (
              <React.Fragment key={n}>
                <BetRow label={`Buy ${n}`} amount={betAmount('buy', n)} increment={suggestedBetIncrement('buy', n)} quality={assistEnabled ? getBetQuality('buy', false, false) : null} onAdd={() => store.placeBet('buy', suggestedBetIncrement('buy', n), n)} onRemove={() => removeBet('buy', n)} />
                {isValidBetForVariant('lay', variant) && (
                  <BetRow label={`Lay ${n}`} amount={betAmount('lay', n)} increment={suggestedBetIncrement('lay', n)} quality={assistEnabled ? getBetQuality('lay', false, false) : null} onAdd={() => store.placeBet('lay', suggestedBetIncrement('lay', n), n)} onRemove={() => removeBet('lay', n)} />
                )}
              </React.Fragment>
            ))}
          </BetCategoryPanel>
        )}

        {isValidBetForVariant('big6', variant) && (
          <BetCategoryPanel title="Big 6 / Big 8" totalWagered={betAmount('big6') + betAmount('big8')}>
            <BetRow label="Big 6 (1:1)" amount={betAmount('big6')} increment={1} quality={assistEnabled ? getBetQuality('big6', false, false) : null} onAdd={() => addBet('big6')} onRemove={() => removeBet('big6')} />
            <BetRow label="Big 8 (1:1)" amount={betAmount('big8')} increment={1} quality={assistEnabled ? getBetQuality('big8', false, false) : null} onAdd={() => addBet('big8')} onRemove={() => removeBet('big8')} />
          </BetCategoryPanel>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.balanceText}>Balance: {balance}</Text>
        <RollButton onRoll={handleRoll} disabled={bets.length === 0} />
      </View>

      {showBanner && (
        <RollResultBanner
          resolution={lastRoll}
          delta={lastDelta}
          onDismiss={() => setShowBanner(false)}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  back: { color: '#aaa', fontSize: 15 },
  headerTitle: { color: '#FFD700', fontWeight: '700', fontSize: 15 },
  assist: { color: '#aaa', fontSize: 13 },
  assistOn: { color: '#FFD700' },
  scroll: { flex: 1 },
  footer: { borderTopWidth: 1, borderColor: '#2a2a3e', paddingBottom: 4 },
  balanceText: { color: '#aaa', fontSize: 13, textAlign: 'center', paddingTop: 8 },
})
