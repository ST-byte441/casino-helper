import React from 'react'
import { View, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { ActiveBet, CrapsPhase, CrapsTableRules } from '../../../../lib/types'
import { canRemoveBet, getMaxLayOdds, getMaxOdds } from '../../engine'
import { useCrapsStore } from '../../store'
import { WorkingToggle } from '../WorkingToggle'

type Props = {
  bet: ActiveBet
  phase: CrapsPhase
  point: number | null
  rules: CrapsTableRules
  onClose(): void
}

const NAMES: Record<string, string> = {
  pass: 'Pass', 'dont-pass': "Don't Pass", come: 'Come', 'dont-come': "Don't Come", place: 'Place', buy: 'Buy',
  lay: 'Lay', hardway: 'Hardway', field: 'Field', 'any-7': 'Any 7', 'any-craps': 'Any Craps', horn: 'Horn',
  world: 'World', 'hi-lo': 'Hi-Lo', ce: 'C&E', big6: 'Big 6', big8: 'Big 8',
}

export function betTitle(bet: ActiveBet): string {
  const name = NAMES[bet.type] ?? bet.type
  const n = bet.type === 'hardway' || bet.type === 'place' || bet.type === 'buy' || bet.type === 'lay' ? bet.number : bet.comePoint
  return `${name}${n != null ? ` ${n}` : ''} $${bet.amount}${bet.odds ? ` + $${bet.odds} odds` : ''}`
}

/** The most odds this bet can carry, against its own point; null when it takes no odds yet. */
export function oddsCap(bet: ActiveBet, point: number | null, rules: CrapsTableRules): number | null {
  const isCome = bet.type === 'come' || bet.type === 'dont-come'
  const isLine = isCome || bet.type === 'pass' || bet.type === 'dont-pass'
  const betPoint = isCome ? bet.comePoint : point
  if (!isLine || betPoint == null) return null
  return bet.type === 'dont-pass' || bet.type === 'dont-come'
    ? getMaxLayOdds(bet.amount, betPoint, rules.oddsMultiple)
    : getMaxOdds(bet.amount, betPoint, rules.oddsMultiple)
}

export function StackMenu({ bet: shown, phase, point, rules, onClose }: Props) {
  // Read the live bet so the title and buttons follow each change.
  const bet = useCrapsStore(s => s.bets.find(b => b.id === shown.id))
  const selectedChip = useCrapsStore(s => s.selectedChip)
  if (!bet) return null
  const step = selectedChip ?? 1
  const cap = oddsCap(bet, point, rules)
  const odds = bet.odds ?? 0
  const s = useCrapsStore.getState()
  const canToggle = ['place', 'buy', 'lay', 'hardway'].includes(bet.type)

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable testID="stack-menu-backdrop" style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text testID="stack-menu-title" style={styles.title}>{betTitle(bet)}</Text>
          {cap != null && (
            <View style={styles.row}>
              <Text style={styles.label}>Odds ${step}</Text>
              <TouchableOpacity testID="stack-odds-minus" style={[styles.btn, odds === 0 && styles.off]}
                disabled={odds === 0} onPress={() => s.addOdds(bet.id, -Math.min(step, odds))}>
                <Text style={styles.btnText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="stack-odds-plus" style={[styles.btn, odds >= cap && styles.off]}
                disabled={odds >= cap} onPress={() => useCrapsStore.getState().addOdds(bet.id, step)}>
                <Text style={styles.btnText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
          {canToggle && (
            <View style={styles.row}>
              <Text style={styles.label}>Working</Text>
              <WorkingToggle working={bet.working} onToggle={() => useCrapsStore.getState().toggleWorking(bet.id)} />
            </View>
          )}
          {canRemoveBet(bet, phase) && (
            <TouchableOpacity testID="stack-take-down" style={styles.takeDown}
              onPress={() => { useCrapsStore.getState().removeBet(bet.id); onClose() }}>
              <Text style={styles.takeDownText}>Take down</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#1e1e2e', borderRadius: 10, padding: 14, minWidth: 240, gap: 10 },
  title: { color: '#FFD700', fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: '#fff', flex: 1, fontSize: 14 },
  btn: { backgroundColor: '#2a2a3e', borderRadius: 6, minWidth: 44, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.3 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  takeDown: { backgroundColor: '#5a2230', borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  takeDownText: { color: '#fff', fontWeight: '700' },
})
