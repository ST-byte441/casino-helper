import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Card as CardType, Value, BaccaratBet } from '../../lib/types'
import { Card } from '../../features/blackjack/components/Card'
import { RankPicker } from '../../features/blackjack/components/RankPicker'
import {
  baccaratValue, scoreHand, isNatural, isPair,
  shouldPlayerDraw, shouldBankerDraw, resolveRound, calculateDeltas,
} from '../../features/baccarat/engine'

type SandboxPhase = 'setup' | 'player-draw' | 'banker-draw' | 'result'
type Slot = 'p1' | 'p2' | 'b1' | 'b2' | 'p3' | 'b3'

function makeCard(value: Value): CardType {
  return { value, suit: '♠' }
}

export default function BaccaratSandbox() {
  const router = useRouter()
  const [phase, setPhase] = useState<SandboxPhase>('setup')
  const [cards, setCards] = useState<Partial<Record<Slot, CardType>>>({})
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null)
  const [explanation, setExplanation] = useState('')

  function reset() {
    setPhase('setup')
    setCards({})
    setExplanation('')
  }

  function playerHand(): CardType[] {
    const h: CardType[] = []
    if (cards.p1) h.push(cards.p1)
    if (cards.p2) h.push(cards.p2)
    if (cards.p3) h.push(cards.p3)
    return h
  }

  function bankerHand(): CardType[] {
    const h: CardType[] = []
    if (cards.b1) h.push(cards.b1)
    if (cards.b2) h.push(cards.b2)
    if (cards.b3) h.push(cards.b3)
    return h
  }

  function evaluate() {
    const ph = [cards.p1!, cards.p2!]
    const bh = [cards.b1!, cards.b2!]
    const pScore = scoreHand(ph)
    const bScore = scoreHand(bh)

    if (isNatural(ph) || isNatural(bh)) {
      setExplanation(
        isNatural(ph) && isNatural(bh)
          ? `Both hands are naturals (Player ${pScore}, Banker ${bScore}) — no further cards.`
          : isNatural(ph)
          ? `Natural! Player has ${pScore} — no further cards drawn.`
          : `Natural! Banker has ${bScore} — no further cards drawn.`
      )
      setPhase('result')
      return
    }

    if (shouldPlayerDraw(pScore)) {
      setExplanation(`Player total is ${pScore} (0–5) — Player must draw a third card.`)
      setPhase('player-draw')
    } else {
      setExplanation(`Player total is ${pScore} (6–7) — Player stands.`)
      checkBankerDraw(bScore, false, undefined)
    }
  }

  function confirmPlayerCard() {
    const bh = [cards.b1!, cards.b2!]
    const bScore = scoreHand(bh)
    const p3val = baccaratValue(cards.p3!)
    checkBankerDraw(bScore, true, p3val)
  }

  function checkBankerDraw(bScore: number, playerDrewThird: boolean, playerThirdCard?: number) {
    if (shouldBankerDraw(bScore, playerDrewThird, playerThirdCard)) {
      const reason = playerDrewThird
        ? `Banker total is ${bScore}, Player's third card was ${playerThirdCard} — Banker must draw.`
        : `Banker total is ${bScore} (0–5) — Banker must draw.`
      setExplanation(reason)
      setPhase('banker-draw')
    } else {
      const reason = playerDrewThird
        ? `Banker total is ${bScore}, Player's third card was ${playerThirdCard} — Banker stands.`
        : `Banker total is ${bScore} (6–7) — Banker stands.`
      setExplanation(reason)
      setPhase('result')
    }
  }

  const setupComplete = cards.p1 && cards.p2 && cards.b1 && cards.b2
  const ph = playerHand()
  const bh = bankerHand()
  const outcome = phase === 'result' ? resolveRound(ph, bh) : null

  const allBets: BaccaratBet[] = ['player', 'banker', 'tie', 'player-pair', 'banker-pair']
  const PAYOUT_LABELS: Record<BaccaratBet, string> = {
    player: 'Player (1:1)',
    banker: 'Banker (0.95:1)',
    tie: 'Tie (8:1)',
    'player-pair': 'Player Pair (11:1)',
    'banker-pair': 'Banker Pair (11:1)',
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Baccarat Sandbox</Text>
        <TouchableOpacity onPress={reset}>
          <Text style={styles.resetBtn}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BANKER</Text>
          <View style={styles.handRow}>
            {(['b1', 'b2'] as Slot[]).map(slot => (
              <TouchableOpacity
                key={slot}
                style={[styles.cardSlot, cards[slot] && styles.cardSlotFilled]}
                onPress={() => setActiveSlot(slot)}
                disabled={phase !== 'setup'}
              >
                {cards[slot]
                  ? <Card card={cards[slot]!} />
                  : <Text style={styles.slotPlaceholder}>?</Text>}
              </TouchableOpacity>
            ))}
            {cards.b3 && <Card card={cards.b3} />}
          </View>
          {bh.length > 0 && (
            <Text style={styles.handScore}>
              Score: {scoreHand(bh)}{cards.b1 && cards.b2 && isPair([cards.b1, cards.b2]) ? '  · Pair!' : ''}
            </Text>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PLAYER</Text>
          <View style={styles.handRow}>
            {(['p1', 'p2'] as Slot[]).map(slot => (
              <TouchableOpacity
                key={slot}
                style={[styles.cardSlot, cards[slot] && styles.cardSlotFilled]}
                onPress={() => setActiveSlot(slot)}
                disabled={phase !== 'setup'}
              >
                {cards[slot]
                  ? <Card card={cards[slot]!} />
                  : <Text style={styles.slotPlaceholder}>?</Text>}
              </TouchableOpacity>
            ))}
            {cards.p3 && <Card card={cards.p3} />}
          </View>
          {ph.length > 0 && (
            <Text style={styles.handScore}>
              Score: {scoreHand(ph)}{cards.p1 && cards.p2 && isPair([cards.p1, cards.p2]) ? '  · Pair!' : ''}
            </Text>
          )}
        </View>

        {explanation !== '' && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationText}>{explanation}</Text>
          </View>
        )}

        {phase === 'player-draw' && !cards.p3 && (
          <View style={styles.drawSection}>
            <Text style={styles.drawLabel}>Pick Player's 3rd card:</Text>
            <TouchableOpacity style={styles.cardSlot} onPress={() => setActiveSlot('p3')}>
              <Text style={styles.slotPlaceholder}>?</Text>
            </TouchableOpacity>
          </View>
        )}
        {phase === 'player-draw' && cards.p3 && (
          <TouchableOpacity style={styles.actionBtn} onPress={confirmPlayerCard}>
            <Text style={styles.actionBtnText}>Confirm → Evaluate Banker</Text>
          </TouchableOpacity>
        )}

        {phase === 'banker-draw' && !cards.b3 && (
          <View style={styles.drawSection}>
            <Text style={styles.drawLabel}>Pick Banker's 3rd card:</Text>
            <TouchableOpacity style={styles.cardSlot} onPress={() => setActiveSlot('b3')}>
              <Text style={styles.slotPlaceholder}>?</Text>
            </TouchableOpacity>
          </View>
        )}
        {phase === 'banker-draw' && cards.b3 && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => setPhase('result')}>
            <Text style={styles.actionBtnText}>Confirm → See Result</Text>
          </TouchableOpacity>
        )}

        {phase === 'result' && outcome && (
          <View style={styles.resultSection}>
            <Text style={styles.resultLabel}>
              {outcome === 'player' ? 'Player Wins' : outcome === 'banker' ? 'Banker Wins' : 'Tie'}
            </Text>
            <Text style={styles.payoutsHeading}>$10 bet payouts:</Text>
            {allBets.map(bet => {
              const delta = calculateDeltas({ [bet]: 10 }, outcome, ph, bh)[bet] ?? -10
              const sign = delta >= 0 ? '+' : '-'
              return (
                <Text key={bet} style={[styles.payoutRow, delta > 0 ? styles.win : delta < 0 ? styles.lose : styles.push]}>
                  {PAYOUT_LABELS[bet]}: {sign}${Math.abs(delta)}
                </Text>
              )
            })}
          </View>
        )}

        {phase === 'setup' && (
          <TouchableOpacity
            style={[styles.actionBtn, !setupComplete && styles.actionBtnDisabled]}
            disabled={!setupComplete}
            onPress={evaluate}
          >
            <Text style={styles.actionBtnText}>Evaluate</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {activeSlot && (
        <RankPicker
          onSelect={value => {
            setCards(prev => ({ ...prev, [activeSlot]: makeCard(value) }))
            setActiveSlot(null)
          }}
          onClose={() => setActiveSlot(null)}
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
  resetBtn: { color: '#aaa', fontSize: 14 },
  content: { padding: 16, gap: 16 },
  section: { alignItems: 'center', gap: 8 },
  sectionLabel: { color: '#aaa', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  handRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  handScore: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardSlot: { width: 60, height: 84, backgroundColor: '#1e1e2e', borderRadius: 8,
    borderWidth: 2, borderColor: '#2a2a3e', alignItems: 'center', justifyContent: 'center' },
  cardSlotFilled: { borderColor: 'transparent', backgroundColor: 'transparent' },
  slotPlaceholder: { color: '#555', fontSize: 24 },
  divider: { height: 1, backgroundColor: '#2a2a3e' },
  explanationBox: { backgroundColor: '#1e1e2e', borderRadius: 10, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#FFD700' },
  explanationText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  drawSection: { alignItems: 'center', gap: 8 },
  drawLabel: { color: '#aaa', fontSize: 14 },
  actionBtn: { backgroundColor: '#FFD700', borderRadius: 10, padding: 16, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { color: '#13131f', fontWeight: '800', fontSize: 15 },
  resultSection: { gap: 8 },
  resultLabel: { color: '#FFD700', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  payoutsHeading: { color: '#aaa', fontSize: 13, marginTop: 8 },
  payoutRow: { fontSize: 14, fontWeight: '600' },
  win: { color: '#2ecc71' },
  lose: { color: '#e74c3c' },
  push: { color: '#aaa' },
})
