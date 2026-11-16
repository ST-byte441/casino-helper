import React from 'react'
import { View, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { ActiveBet, CrapsPhase, CrapsTableRules } from '../../../../lib/types'
import { canRemoveBet, oddsCap, oddsStep } from '../../engine'
import { fixTarget, maxExactOdds, payoutCheck, payoutFor, payoutHint } from '../../assist'
import { shownBalance } from '../../bankroll'
import { useProfileStore } from '../../../profile/store'
import { useCrapsStore } from '../../store'
import { WorkingToggle } from '../WorkingToggle'

type Props = {
  bet: ActiveBet
  phase: CrapsPhase
  point: number | null
  rules: CrapsTableRules
  /** Assist: the payout hint, the one-tap fix, green odds steps that land exact, and Max exact. */
  assist?: boolean
  onClose(): void
}

/** Background of an odds step that would land on an exact amount (Assist). */
export const EXACT_STEP_BG = '#1e6b3a'

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

/** Odds steps, as the list's OddsRow offers: one + and one − button per step. */
export const ODDS_STEPS = [1, 5, 25] as const

export function StackMenu({ bet: shown, phase, point, rules, assist, onClose }: Props) {
  // Read the live bet (and the balance) so the title, notice and buttons follow each change.
  const bet = useCrapsStore(s => s.bets.find(b => b.id === shown.id))
  const notice = useCrapsStore(s => s.notice)
  const profile = useProfileStore(s => s.profiles.find(p => p.id === s.activeProfileId))
  const allBets = useCrapsStore(s => s.bets)
  if (!bet) return null
  const cap = oddsCap(bet, point, rules.oddsMultiple)
  const odds = bet.odds ?? 0
  const s = useCrapsStore.getState()
  const canToggle = ['place', 'buy', 'lay', 'hardway'].includes(bet.type)

  // Assist. `free`: what can still go on the table (the shown balance).
  const free = !profile || profile.bankrollMode === 'infinite' ? Infinity : shownBalance(profile.balance, allBets)
  const check = assist ? payoutCheck(bet, point) : null
  const hint = check ? payoutHint(check) : null
  const fix = check ? fixTarget(check, { cap: check.kind === 'place' ? null : cap, free }) : null
  const lay = bet.type === 'dont-pass' || bet.type === 'dont-come'
  const betPoint = bet.type === 'come' || bet.type === 'dont-come' ? bet.comePoint : point
  const step = assist && cap != null && betPoint != null ? oddsStep(betPoint, lay) : null
  const maxExact = step != null && cap != null ? maxExactOdds(step, cap, odds, free) : 0

  function applyFix(target: number) {
    const st = useCrapsStore.getState()
    if (check!.kind !== 'place') {
      st.addOdds(bet!.id, target - odds)
      return
    }
    if (target > bet!.amount) st.placeBet('place', target - bet!.amount, bet!.number)
    else st.reduceBet(bet!.id, bet!.amount - target)
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable testID="stack-menu-backdrop" style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text testID="stack-menu-title" style={styles.title}>{betTitle(bet)}</Text>
          {/* The store's refusals show here: the header's reason line is behind the backdrop. */}
          <Text testID="stack-menu-notice" style={styles.notice} numberOfLines={2}>{notice ?? ' '}</Text>
          {hint && <Text testID="stack-menu-hint" style={styles.hint}>{hint}</Text>}
          {fix != null && (
            <TouchableOpacity testID="stack-fix" style={styles.fix} onPress={() => applyFix(fix)}>
              <Text style={styles.btnText}>Make it ${fix} (pays ${payoutFor(check!, fix)})</Text>
            </TouchableOpacity>
          )}
          {cap != null && (
            <>
              <Text style={styles.label}>Odds ${odds} (max ${cap})</Text>
              <View style={styles.row}>
                {ODDS_STEPS.map(n => {
                  const off = odds + n > cap || !s.canAfford(n)
                  const exact = step != null && !off && (odds + n) % step === 0
                  return (
                    <TouchableOpacity key={n} testID={`stack-odds-plus-${n}`}
                      style={[styles.btn, exact && styles.exact, off && styles.off]}
                      disabled={off} onPress={() => useCrapsStore.getState().addOdds(bet.id, n)}>
                      <Text style={styles.btnText}>+${n}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              <View style={styles.row}>
                {ODDS_STEPS.map(n => (
                  <TouchableOpacity key={n} testID={`stack-odds-minus-${n}`} style={[styles.btn, odds === 0 && styles.off]}
                    disabled={odds === 0} onPress={() => useCrapsStore.getState().addOdds(bet.id, -Math.min(n, odds))}>
                    <Text style={styles.btnText}>−${n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {maxExact > 0 && maxExact !== odds && (
                <TouchableOpacity testID="stack-odds-max" style={styles.fix}
                  onPress={() => useCrapsStore.getState().addOdds(bet.id, maxExact - odds)}>
                  <Text style={styles.btnText}>Max exact ${maxExact}</Text>
                </TouchableOpacity>
              )}
            </>
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
  notice: { color: '#aaa', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: '#fff', flex: 1, fontSize: 14 },
  hint: { color: '#f39c12', fontSize: 13 },
  fix: { backgroundColor: EXACT_STEP_BG, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  exact: { backgroundColor: EXACT_STEP_BG },
  btn: { flex: 1, backgroundColor: '#2a2a3e', borderRadius: 6, minWidth: 56, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.3 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  takeDown: { backgroundColor: '#5a2230', borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  takeDownText: { color: '#fff', fontWeight: '700' },
})
