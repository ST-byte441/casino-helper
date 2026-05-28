import { useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Value, Card as CardType, TableRules, SoftSeven, SurrenderMode } from '../../lib/types'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'
import { getOptimalAction } from '../../features/blackjack/strategy'
import { Card } from '../../features/blackjack/components/Card'
import { RankPicker } from '../../features/blackjack/components/RankPicker'
import { scoreHand } from '../../features/blackjack/engine'

type PickerTarget = 'dealer' | 'player' | null
type PlayerCard = { id: number; value: Value }

type SegmentedProps<T extends string | number | boolean> = {
  label: string
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}

function RuleRow<T extends string | number | boolean>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={ruleStyles.row}>
      <Text style={ruleStyles.label}>{label}</Text>
      <View style={ruleStyles.segments}>
        {options.map(opt => (
          <TouchableOpacity
            key={String(opt.value)}
            style={[ruleStyles.segment, value === opt.value && ruleStyles.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[ruleStyles.segmentText, value === opt.value && ruleStyles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const ruleStyles = StyleSheet.create({
  row: { marginBottom: 16 },
  label: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#2a2a3e', alignItems: 'center' },
  segmentActive: { backgroundColor: '#FFD700' },
  segmentText: { color: '#aaa', fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: '#000' },
})

const ACTION_LABEL: Record<string, string> = {
  hit: 'HIT', stand: 'STAND', double: 'DOUBLE DOWN', split: 'SPLIT', surrender: 'SURRENDER',
}

export default function SandboxScreen() {
  const nextId = useRef(0)
  const [dealerRank, setDealerRank] = useState<Value | null>(null)
  const [playerCards, setPlayerCards] = useState<PlayerCard[]>([])
  const [tableRules, setTableRules] = useState<TableRules>(DEFAULT_TABLE_RULES)
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null)
  const [rulesOpen, setRulesOpen] = useState(false)

  const dealerCard: CardType | null = dealerRank ? { suit: '♠', value: dealerRank } : null
  const playerHand: CardType[] = playerCards.map(c => ({ suit: '♠', value: c.value }))

  const rawAction =
    dealerCard && playerHand.length >= 2
      ? getOptimalAction(playerHand, dealerCard, tableRules)
      : null
  // double is only legal on the initial 2-card hand; fall back to hit for 3+ cards
  const optimalAction = rawAction === 'double' && playerHand.length > 2 ? 'hit' : rawAction

  function handlePickerSelect(value: Value) {
    if (pickerTarget === 'dealer') {
      setDealerRank(value)
    } else if (pickerTarget === 'player') {
      setPlayerCards(cs => [...cs, { id: nextId.current++, value }])
    }
    setPickerTarget(null)
  }

  function removePlayerCard(id: number) {
    setPlayerCards(cs => cs.filter(c => c.id !== id))
  }

  function clearAll() {
    setDealerRank(null)
    setPlayerCards([])
  }

  const set = <K extends keyof TableRules>(key: K, val: TableRules[K]) =>
    setTableRules(r => ({ ...r, [key]: val }))

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Strategy Sandbox</Text>
        <TouchableOpacity onPress={() => setRulesOpen(true)}>
          <Text style={styles.gearIcon}>⚙️</Text>
        </TouchableOpacity>
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
            {playerCards.map(pc => (
              <TouchableOpacity key={pc.id} style={styles.removableCard} onPress={() => removePlayerCard(pc.id)}>
                <Card card={{ suit: '♠', value: pc.value }} />
                <View style={styles.removeBadge}>
                  <Text style={styles.removeBadgeText}>×</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addCardBtn} onPress={() => setPickerTarget('player')}>
              <Text style={styles.addCardText}>+</Text>
            </TouchableOpacity>
          </View>
          {playerCards.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Rank picker modal */}
      {pickerTarget !== null && (
        <RankPicker
          onSelect={handlePickerSelect}
          onClose={() => setPickerTarget(null)}
        />
      )}

      {/* Rules modal */}
      <Modal visible={rulesOpen} transparent animationType="slide" onRequestClose={() => setRulesOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRulesOpen(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1}>
            <Text style={styles.modalTitle}>Table Rules</Text>
            <View>
              <RuleRow<SoftSeven>
                label="Dealer Soft 17"
                options={[{ label: 'Hit (H17)', value: 'H17' }, { label: 'Stand (S17)', value: 'S17' }]}
                value={tableRules.dealerSoft17} onChange={v => set('dealerSoft17', v)}
              />
              <RuleRow<SurrenderMode>
                label="Surrender"
                options={[{ label: 'None', value: 'none' }, { label: 'Late', value: 'late' }, { label: 'Early', value: 'early' }]}
                value={tableRules.surrender} onChange={v => set('surrender', v)}
              />
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setRulesOpen(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  gearIcon: { fontSize: 22, padding: 8 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#1e1e2e', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, maxHeight: '85%' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 20 },
  doneBtn: { backgroundColor: '#FFD700', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  doneBtnText: { fontWeight: '700', fontSize: 16 },
})
