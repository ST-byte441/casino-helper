import React, { useMemo, useState } from 'react'
import { View, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { Text } from '../../../../components/Text'
import { CHIP_SIZE } from '../../../../components/chips/chips'
import { ChipFace } from '../../../../components/chips/ChipFace'
import { ChipTray } from '../../../../components/chips/ChipTray'
import { DragHandle } from '../../../../components/chips/DragHandle'
import { useChipTable } from '../../../../components/chips/useChipTable'
import { ActiveBet, BetQuality, BetType } from '../../../../lib/types'
import { TableSize } from '../../../../lib/tableSize'
import { useProfileStore } from '../../../profile/store'
import { formatMoney } from '../../../profile/format'
import { getMaxLayOdds, getMaxOdds } from '../../engine'
import { CrapsLayout, SpotKey, buildCrapsLayout, hitCraps } from '../../layout'
import { SpotAction, spotAction, stackTapAction } from '../../spots'
import { getBetQuality } from '../../strategy'
import { useCrapsStore } from '../../store'
import { DiceDisplay } from '../DiceDisplay'
import { RollButton } from '../RollButton'
import { CrapsFelt, feltStacks } from './CrapsFelt'

export const CRAPS_CHIPS = [1, 5, 25, 100] as const

type Props = {
  /** Chip scaling for large screens comes later; accepted now so the screen can pass it. */
  size: TableSize
  onRoll(): void
  /** A tap on a stack with no chip selected (the stack menu). */
  onStackMenu?(bet: ActiveBet): void
}

/** What a board point resolves to: a drawn stack (its bet, and whether it is the odds stack), or an area. */
export type TableTarget =
  | { kind: 'stack'; bet: ActiveBet; odds: boolean }
  | { kind: 'spot'; key: SpotKey }

const STACK_PREFIX = 'stack:'

/**
 * The target under board-local (x, y): a drawn stack within its radius first (the nearest), as roulette's
 * tapTarget does, else the smallest area. Odds areas only count once a point is set (they aren't drawn before).
 */
export function tableTarget(
  layout: CrapsLayout, bets: ActiveBet[], point: number | null, x: number, y: number,
): TableTarget | null {
  if (x < 0 || x > layout.width || y < 0 || y > layout.height) return null
  let best: { key: string; dist: number } | null = null
  for (const s of feltStacks(layout, bets, point)) {
    const dist = Math.hypot(x - s.at.x, y - s.at.y)
    if (dist <= s.size / 2 && (!best || dist < best.dist)) best = { key: s.key, dist }
  }
  if (best) {
    const own = bets.find(b => b.id === best.key)
    if (own) return { kind: 'stack', bet: own, odds: false }
    const flat = bets.find(b => `${b.id}-odds` === best.key)
    if (flat) return { kind: 'stack', bet: flat, odds: true }
  }
  const areas = point == null ? layout.areas.filter(a => a.tone !== 'odds') : layout.areas
  const key = hitCraps({ ...layout, areas }, x, y)
  return key ? { kind: 'spot', key } : null
}

const encode = (t: TableTarget | null): string | null =>
  !t ? null : t.kind === 'stack' ? `${STACK_PREFIX}${t.bet.id}${t.odds ? ':odds' : ''}` : t.key

/** The inverse of `encode`, against the current bets (null if that bet has gone). */
function decode(target: string | null, bets: ActiveBet[]): TableTarget | null {
  if (!target) return null
  if (!target.startsWith(STACK_PREFIX)) return { kind: 'spot', key: target as SpotKey }
  const rest = target.slice(STACK_PREFIX.length)
  const odds = rest.endsWith(':odds')
  const id = odds ? rest.slice(0, -':odds'.length) : rest
  const bet = bets.find(b => b.id === id)
  return bet ? { kind: 'stack', bet, odds } : null
}

/** What a chip on `target` does: an odds stack takes more odds; other stacks and areas use the spot rules. */
function actionFor(target: TableTarget, bets: ActiveBet[], point: number | null): SpotAction {
  if (target.kind === 'stack') return target.odds ? { kind: 'odds', betId: target.bet.id } : stackTapAction(target.bet)
  return spotAction(target.key, bets, point)
}

/** Applies a chip of `chip` dollars to the store; the store sets the notice when it refuses. */
function applyChip(action: SpotAction, chip: number): boolean {
  const s = useCrapsStore.getState()
  switch (action.kind) {
    case 'place': return s.placeBet(action.type, chip * (action.units ?? 1), action.number, action.hopDice)
    case 'odds': return s.addOdds(action.betId, chip)
    case 'none': return false
  }
}

/** Natural size of DiceDisplay is wider than the dice column; scale it down to fit. */
function FitWidth({ width, children }: { width: number; children: React.ReactNode }) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout
    if (!natural || natural.w !== w || natural.h !== h) setNatural({ w, h })
  }
  const scale = natural ? Math.min(1, width / natural.w) : 1
  return (
    <View style={{ width, height: natural ? natural.h * scale : undefined, alignItems: 'center' }}>
      <View onLayout={onLayout} style={[styles.fitInner, natural && {
        transform: [{ translateY: -(natural.h * (1 - scale)) / 2 }, { scale }],
      }]}>
        {children}
      </View>
    </View>
  )
}

export function CrapsTable({ onRoll, onStackMenu }: Props) {
  const router = useRouter()
  const bets = useCrapsStore(s => s.bets)
  const point = useCrapsStore(s => s.point)
  const dice = useCrapsStore(s => s.dice)
  const notice = useCrapsStore(s => s.notice)
  const tableRules = useCrapsStore(s => s.tableRules)
  const assistEnabled = useCrapsStore(s => s.assistEnabled)
  const toggleAssist = useCrapsStore(s => s.toggleAssist)
  const selectedChip = useCrapsStore(s => s.selectedChip)
  const selectChip = useCrapsStore(s => s.selectChip)
  const active = useProfileStore(s => s.profiles.find(p => p.id === s.activeProfileId))
  const balance = active ? (active.bankrollMode === 'infinite' ? '∞' : formatMoney(active.balance)) : '—'

  const targetAt = (x: number, y: number) => {
    const s = useCrapsStore.getState()
    return layout ? tableTarget(layout, s.bets, s.point, x, y) : null
  }

  // The hook only calls `hit` once the board is laid out, so `layout` is set whenever these run.
  const table = useChipTable({
    hit: (x, y) => encode(targetAt(x, y)),
    onDrop(source, target, offBoard) {
      const s = useCrapsStore.getState()
      if (source.type === 'stack') {
        // Stacks never move between areas; off the felt a removable one is taken down (the store checks).
        if (offBoard) s.removeBet(source.id)
        return
      }
      const t = decode(target, s.bets)
      if (t) applyChip(actionFor(t, s.bets, s.point), source.amount)
    },
    onTapPoint(x, y) {
      const s = useCrapsStore.getState()
      const t = targetAt(x, y)
      if (!t) return
      if (s.selectedChip === null) {
        if (t.kind === 'stack') onStackMenu?.(t.bet)
        return
      }
      if (applyChip(actionFor(t, s.bets, s.point), s.selectedChip) && layout) {
        const key = t.kind === 'spot' ? t.key : hitCraps(layout, x, y)
        if (key) table.flash(key)
      }
    },
    stackAmount: id => useCrapsStore.getState().bets.find(b => b.id === id)?.amount ?? 0,
  })
  const { rootRef, boardRef, onRootLayout, onBoardLayout, boardSize, handlers, ghostStyle, dragAmount,
    highlight, boardTap } = table
  const layout = useMemo<CrapsLayout | null>(
    () => (boardSize ? buildCrapsLayout(tableRules.variant, boardSize.w, boardSize.h) : null),
    [tableRules.variant, boardSize],
  )

  function quality(key: SpotKey): BetQuality | null {
    if (!assistEnabled) return null
    const a = spotAction(key, bets, point)
    if (a.kind === 'odds') return 'optimal'
    if (a.kind !== 'place') return null
    return lineQuality(a.type, a.number)
  }

  // As the list's getQuality: line bets are optimal once their odds reach the table's cap.
  function lineQuality(type: BetType, number?: number): BetQuality {
    const bet = bets.find(b => b.type === type && (number == null || b.number === number))
    const hasOdds = (bet?.odds ?? 0) > 0
    const maxOdds = !point || !bet ? 0
      : type === 'dont-pass' ? getMaxLayOdds(bet.amount, point, tableRules.oddsMultiple)
      : getMaxOdds(bet.amount, point, tableRules.oddsMultiple)
    return getBetQuality(type, hasOdds, hasOdds && (bet?.odds ?? 0) >= maxOdds, number)
  }

  const lit = highlight && !highlight.startsWith(STACK_PREFIX) ? (highlight as SpotKey) : null

  return (
    <View ref={rootRef} style={styles.root} onLayout={onRootLayout}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>CRAPS · {tableRules.oddsMultiple}</Text>
        <TouchableOpacity onPress={toggleAssist} hitSlop={8}>
          <Text style={[styles.assist, assistEnabled && styles.assistOn]}>Assist {assistEnabled ? '●' : '○'}</Text>
        </TouchableOpacity>
        <Text style={styles.balance}>{balance}</Text>
      </View>

      <View style={styles.boardFrame}>
        <GestureDetector gesture={boardTap}>
          <View ref={boardRef} testID="craps-board" style={styles.board} onLayout={onBoardLayout}>
            {layout && (
              <>
                <CrapsFelt layout={layout} bets={bets} point={point} highlight={lit}
                  quality={assistEnabled ? quality : undefined} fieldPays3on12={tableRules.fieldPays3on12} />
                {feltStacks(layout, bets, point).filter(s => bets.some(b => b.id === s.key)).map(s => (
                  <DragHandle
                    key={s.key}
                    testID={`stack-handle-${s.key}`}
                    source={{ type: 'stack', id: s.key }}
                    {...handlers}
                    style={[styles.stackHandle, {
                      left: s.at.x - s.size / 2, top: s.at.y - s.size / 2,
                      width: s.size, height: s.size, borderRadius: s.size / 2,
                    }]}
                  />
                ))}
              </>
            )}
          </View>
        </GestureDetector>
        {/* A sibling of the board, not inside its tap detector, so ROLL is an ordinary button. */}
        {layout && (
          <View style={[styles.dice, {
            left: layout.diceRect.x, top: layout.diceRect.y, width: layout.diceRect.w, height: layout.diceRect.h,
          }]}>
            <FitWidth width={layout.diceRect.w}>
              <DiceDisplay dice={dice} point={point} />
            </FitWidth>
            <RollButton onRoll={onRoll} disabled={bets.length === 0} />
          </View>
        )}
      </View>

      <Text testID="craps-reason" style={styles.reason} numberOfLines={1}>{notice ?? ' '}</Text>

      <ChipTray chips={CRAPS_CHIPS} selected={selectedChip} onSelect={selectChip} handlers={handlers}
        style={styles.tray} />

      {dragAmount !== null && (
        <Animated.View pointerEvents="none" style={[styles.ghost, ghostStyle]}>
          <ChipFace amount={dragAmount} size={CHIP_SIZE} />
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 4,
    borderBottomWidth: 1, borderColor: '#2a2a3e' },
  back: { color: '#aaa', fontSize: 14 },
  title: { flex: 1, color: '#FFD700', fontWeight: '700', fontSize: 14 },
  assist: { color: '#aaa', fontSize: 13 },
  assistOn: { color: '#FFD700' },
  balance: { color: '#fff', fontWeight: '700', fontSize: 13 },
  boardFrame: { flex: 1, marginHorizontal: 8, marginTop: 4 },
  board: { flex: 1 },
  stackHandle: { position: 'absolute' },
  dice: { position: 'absolute', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fitInner: { alignSelf: 'center' },
  reason: { color: '#aaa', fontSize: 13, textAlign: 'center', marginTop: 2 },
  tray: { paddingVertical: 6 },
  // Slightly see-through so the highlighted area shows through the chip.
  ghost: { position: 'absolute', left: 0, top: 0, opacity: 0.8 },
})
