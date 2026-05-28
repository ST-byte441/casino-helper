import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Value, Card as CardType, TableRules } from '../../lib/types'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'
import { getOptimalAction } from '../../features/blackjack/strategy'
import { Card } from '../../features/blackjack/components/Card'
import { RankPicker } from '../../features/blackjack/components/RankPicker'
import { scoreHand } from '../../features/blackjack/engine'

type PickerTarget = 'dealer' | 'player' | null

export default function SandboxScreen() {
  const [dealerRank, setDealerRank] = useState<Value | null>(null)
  const [playerRanks, setPlayerRanks] = useState<Value[]>([])
  const [tableRules] = useState<TableRules>(DEFAULT_TABLE_RULES)
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null)

  const dealerCard: CardType | null = dealerRank ? { suit: '♠', value: dealerRank } : null
  const playerHand: CardType[] = playerRanks.map(v => ({ suit: '♠', value: v }))

  const optimalAction =
    dealerCard && playerHand.length >= 2
      ? getOptimalAction(playerHand, dealerCard, tableRules)
      : null

  function handlePickerSelect(value: Value) {
    if (pickerTarget === 'dealer') setDealerRank(value)
    else if (pickerTarget === 'player') setPlayerRanks(r => [...r, value])
    setPickerTarget(null)
  }

  function removePlayerCard(index: number) {
    setPlayerRanks(r => r.filter((_, i) => i !== index))
  }

  function clearAll() {
    setDealerRank(null)
    setPlayerRanks([])
  }

  const ACTION_LABEL: Record<string, string> = {
    hit: 'HIT', stand: 'STAND', double: 'DOUBLE DOWN', split: 'SPLIT', surrender: 'SURRENDER',
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Strategy Sandbox</Text>
        <Text style={styles.gearPlaceholder}>{/* gear added in Task 4 */}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Dealer section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DEALER UPCARD</Text>
          <TouchableOpacity
            style={[styles.cardSlot, dealerCard && styles.cardSlotFilled]}
            onPress={() => setPickerTarget('dealer')}
          >
            {dealerCard
              ? <Card card={dealerCard} />
              : <Text style={styles.cardSlotPlaceholder}>Tap to set</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Action banner */}
        <View style={styles.bannerContainer}>
          {optimalAction
            ? <Text style={styles.bannerAction}>{ACTION_LABEL[optimalAction]}</Text>
            : <Text style={styles.bannerPlaceholder}>Set dealer card and at least 2 player cards</Text>
          }
        </View>

        {/* Player hand section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            YOUR HAND{playerHand.length >= 2 ? `  ·  ${scoreHand(playerHand)}` : ''}
          </Text>
          <View style={styles.playerCards}>
            {playerRanks.map((rank, i) => (
              <TouchableOpacity key={i} style={styles.removableCard} onPress={() => removePlayerCard(i)}>
                <Card card={{ suit: '♠', value: rank }} />
                <View style={styles.removeBadge}>
                  <Text style={styles.removeBadgeText}>×</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addCardBtn} onPress={() => setPickerTarget('player')}>
              <Text style={styles.addCardText}>+</Text>
            </TouchableOpacity>
          </View>
          {playerRanks.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {pickerTarget !== null && (
        <RankPicker
          onSelect={handlePickerSelect}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  gearPlaceholder: {},
  scroll: { padding: 16 },
  section: { marginBottom: 24 },
  sectionLabel: { color: '#aaa', fontSize: 12, fontWeight: '600', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 10 },
  cardSlot: { height: 92, borderWidth: 2, borderColor: '#2a2a3e', borderStyle: 'dashed',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardSlotFilled: { borderStyle: 'solid', borderColor: 'transparent' },
  cardSlotPlaceholder: { color: '#555', fontSize: 15 },
  bannerContainer: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 20,
    alignItems: 'center', marginBottom: 24 },
  bannerAction: { color: '#FFD700', fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  bannerPlaceholder: { color: '#555', fontSize: 14, textAlign: 'center' },
  playerCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  removableCard: { position: 'relative' },
  removeBadge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18,
    backgroundColor: '#cc3333', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  removeBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 14 },
  addCardBtn: { width: 52, height: 76, backgroundColor: '#2a2a3e', borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', margin: 4 },
  addCardText: { color: '#FFD700', fontSize: 28, fontWeight: '300' },
  clearBtn: { marginTop: 12, alignSelf: 'flex-end' },
  clearBtnText: { color: '#888', fontSize: 13 },
})
