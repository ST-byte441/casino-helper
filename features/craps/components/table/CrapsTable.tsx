import React, { useMemo, useRef, useState } from 'react'
import { View, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { Text } from '../../../../components/Text'
import { BackButton } from '../../../../components/BackButton'
import { ChipFace } from '../../../../components/chips/ChipFace'
import { ChipTray } from '../../../../components/chips/ChipTray'
import { DragHandle } from '../../../../components/chips/DragHandle'
import { useChipTable } from '../../../../components/chips/useChipTable'
import { ActiveBet, BetQuality, BetType } from '../../../../lib/types'
import { TableSize, sizedStyles } from '../../../../lib/tableSize'
import { Orientation } from '../../../../lib/screenClass'
import { useProfileStore } from '../../../profile/store'
import { formatMoney } from '../../../profile/format'
import { getMaxLayOdds, getMaxOdds } from '../../engine'
import { CrapsLayout, PORTRAIT_FELT_RATIO, SpotKey, TABLE_CHROME, TableChrome, buildCrapsLayout, hitCraps } from '../../layout'
import { SpotAction, spotAction, stackTapAction } from '../../spots'
import { getBetQuality } from '../../strategy'
import { useCrapsStore } from '../../store'
import { DiceDisplay } from '../DiceDisplay'
import { RollButton } from '../RollButton'
import { RollResultBanner } from '../RollResultBanner'
import { CrapsFelt, feltStacks } from './CrapsFelt'
import { StackMenu } from './StackMenu'
import { MoreBetsSheet } from './MoreBetsSheet'
import { RollOverlay } from '../RollOverlay'
import { AssistInfo } from '../AssistInfo'
import { InfoButton } from '../../../../components/InfoSheet'
import { FlashingBalance } from '../../../../components/FlashingBalance'
import { shownBalance } from '../../bankroll'
import { payoutCheck, payoutHint } from '../../assist'

export const CRAPS_CHIPS = [1, 5, 25, 100] as const

/** A roll being shown: the rolled dice, and the table as it stood before the roll. */
type Rolling = {
  dice: [number, number]
  before: { bets: ActiveBet[]; point: number | null; dice: [number, number] | null; balance: number | null }
}

type Props = {
  /** 'large' scales the chips (×1.25), the tray and the header text. */
  size: TableSize
  /** Large portrait puts the felt at full width with the reason line and tray row below it. */
  orientation?: Orientation
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
/** Header balance colours; the balance flashes green / red over these when it changes. */
const BALANCE = '#fff'
const NEGATIVE = '#ff5555'

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

const NO_LINE_BET: Partial<Record<SpotKey, string>> = {
  'pass-odds': 'Make a Pass bet first',
  'dont-pass-odds': "Make a Don't Pass bet first",
}

/** Applies a chip of `chip` dollars on `target` to the store; the store sets the notice when it refuses. */
function applyChip(target: TableTarget, chip: number): boolean {
  const s = useCrapsStore.getState()
  const action = actionFor(target, s.bets, s.point)
  switch (action.kind) {
    case 'place': {
      const ok = s.placeBet(action.type, chip * (action.units ?? 1), action.number, action.hopDice)
      if (ok && action.type === 'place') hintPayout(b => b.type === 'place' && b.number === action.number)
      return ok
    }
    case 'odds': {
      const ok = s.addOdds(action.betId, chip)
      if (ok) hintPayout(b => b.id === action.betId)
      return ok
    }
    case 'none': {
      const why = target.kind === 'spot' ? NO_LINE_BET[target.key] : undefined
      if (why) s.setNotice(why)
      return false
    }
  }
}

/** Assist: after a chip, the reason line says when the bet it went on is paid rounded down, and what pays exactly. */
function hintPayout(which: (b: ActiveBet) => boolean) {
  const s = useCrapsStore.getState()
  if (!s.assistEnabled) return
  const bet = s.bets.find(which)
  const check = bet ? payoutCheck(bet, s.point) : null
  const hint = check ? payoutHint(check) : null
  if (hint) s.setNotice(hint)
}

/** DiceDisplay at its natural size, scaled down (never up) to fit width × height. */
function FitBox({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout
    if (!natural || natural.w !== w || natural.h !== h) setNatural({ w, h })
  }
  const scale = natural ? Math.min(1, width / natural.w, height / natural.h) : 1
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <View onLayout={onLayout} style={[SHEETS.regular.fitInner, natural && { transform: [{ scale }] }]}>
        {children}
      </View>
    </View>
  )
}

/** The dice block: the dice beside ROLL, inside the Pass Line band's right end. */
const ROLL_W = 76
const DICE_GAP = 6

export function CrapsTable({ size, orientation = 'landscape', onRoll, onStackMenu }: Props) {
  const styles = SHEETS[size]
  const chip = TABLE_CHROME[size].chip
  const portrait = size === 'large' && orientation === 'portrait'
  const router = useRouter()
  const liveBets = useCrapsStore(s => s.bets)
  const livePoint = useCrapsStore(s => s.point)
  const liveDice = useCrapsStore(s => s.dice)
  const lastRoll = useCrapsStore(s => s.lastRoll)
  const lastDelta = useCrapsStore(s => s.lastDelta)
  const [showBanner, setShowBanner] = useState(false)
  // The dice tumbling over the felt after ROLL. The store has already rolled; until the dice land the felt, the
  // dice block and the balance show `before` (the table as it was), so nothing gives the result away.
  const [rolling, setRolling] = useState<Rolling | null>(null)
  const rollingRef = useRef(false)
  const bets = rolling ? rolling.before.bets : liveBets
  const point = rolling ? rolling.before.point : livePoint
  const dice = rolling ? rolling.before.dice : liveDice
  const [menuBet, setMenuBet] = useState<ActiveBet | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const phase = useCrapsStore(s => s.phase)
  const notice = useCrapsStore(s => s.notice)
  const tableRules = useCrapsStore(s => s.tableRules)
  const assistEnabled = useCrapsStore(s => s.assistEnabled)
  const toggleAssist = useCrapsStore(s => s.toggleAssist)
  const selectedChip = useCrapsStore(s => s.selectedChip)
  const selectChip = useCrapsStore(s => s.selectChip)
  const canClear = useCrapsStore(s => s.canClear())
  const active = useProfileStore(s => s.profiles.find(p => p.id === s.activeProfileId))
  // The balance less the chips on the table (null: infinite bankroll or no profile).
  const liveBalance = active && active.bankrollMode !== 'infinite' ? shownBalance(active.balance, liveBets) : null
  const balanceValue = rolling ? rolling.before.balance : liveBalance
  const balance = !active ? '—' : balanceValue == null ? '∞' : formatMoney(balanceValue)
  const isNegative = balanceValue != null && balanceValue < 0

  const targetAt = (x: number, y: number) => {
    const s = useCrapsStore.getState()
    return layout ? tableTarget(layout, s.bets, s.point, x, y) : null
  }

  // The hook only calls `hit` once the board is laid out, so `layout` is set whenever these run.
  const table = useChipTable({
    hit: (x, y) => encode(targetAt(x, y)),
    onDrop(source, target, offBoard) {
      // No chips go down (or come off) while the dice roll.
      if (rollingRef.current) return
      const s = useCrapsStore.getState()
      if (source.type === 'stack') {
        // Stacks never move between areas; off the felt a removable one is taken down (the store refuses a
        // contract bet with a notice).
        if (offBoard) s.removeBet(source.id)
        return
      }
      const t = decode(target, s.bets)
      if (t) applyChip(t, source.amount)
    },
    onTapPoint(x, y) {
      if (rollingRef.current) return
      const s = useCrapsStore.getState()
      const t = targetAt(x, y)
      // A tap on the More bets strip (not on a stack in it) opens the More bets panel.
      if (!t || t.kind === 'spot') {
        const m = layout?.moreRect
        if (m && x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h) {
          s.setNotice(null)
          setMoreOpen(true)
          return
        }
      }
      if (!t) return
      if (s.selectedChip === null) {
        if (t.kind === 'stack') { s.setNotice(null); setMenuBet(t.bet); onStackMenu?.(t.bet) }
        return
      }
      if (applyChip(t, s.selectedChip) && layout) {
        const key = t.kind === 'spot' ? t.key : hitCraps(layout, x, y)
        if (key) table.flash(key)
      }
    },
    stackAmount: id => useCrapsStore.getState().bets.find(b => b.id === id)?.amount ?? 0,
    chipSize: chip,
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

  // As the list's getQuality: line bets are optimal once their odds reach the cap at their own point.
  function lineQuality(type: BetType, number?: number): BetQuality {
    const bet = bets.find(b => b.type === type && (number == null || b.number === number))
    const hasOdds = (bet?.odds ?? 0) > 0
    const betPoint = type === 'come' || type === 'dont-come' ? bet?.comePoint : point
    const maxOdds = !betPoint || !bet ? 0
      : type === 'dont-pass' || type === 'dont-come' ? getMaxLayOdds(bet.amount, betPoint, tableRules.oddsMultiple)
      : getMaxOdds(bet.amount, betPoint, tableRules.oddsMultiple)
    return getBetQuality(type, hasOdds, hasOdds && (bet?.odds ?? 0) >= maxOdds, number)
  }

  function handleRoll() {
    const s0 = useCrapsStore.getState()
    const before = { bets: s0.bets, point: s0.point, dice: s0.dice, balance: liveBalance }
    setShowBanner(false)
    onRoll()
    const s1 = useCrapsStore.getState()
    // The store refused (no new roll): don't replay the old dice.
    if (s1.lastRoll === s0.lastRoll || !s1.dice) return
    rollingRef.current = true
    setRolling({ dice: s1.dice, before })
  }

  function rollShown() {
    rollingRef.current = false
    setRolling(null)
    setShowBanner(true)
  }

  const lit = highlight && !highlight.startsWith(STACK_PREFIX) ? (highlight as SpotKey) : null

  const reason = <Text testID="craps-reason" style={styles.reason} numberOfLines={1}>{notice ?? ' '}</Text>
  // Clear: take down every bet allowed (contract bets keep their flat bet, lose their odds).
  const clearOff = !canClear || rolling !== null
  const clear = (
    <TouchableOpacity testID="craps-clear" disabled={clearOff} style={[styles.clear, clearOff && styles.dimmed]}
      onPress={() => useCrapsStore.getState().clearTable()}>
      <Text style={styles.clearText}>Clear</Text>
    </TouchableOpacity>
  )
  const tray = (
    <View style={portrait ? styles.trayRowWrap : styles.trayWrap}>
      <ChipTray chips={CRAPS_CHIPS} selected={selectedChip} onSelect={selectChip} handlers={handlers} size={chip}
        direction={portrait ? 'row' : 'column'} style={portrait ? styles.trayRow : styles.tray} />
      {clear}
    </View>
  )
  const boardFrame = (
      <View style={portrait ? styles.boardFramePortrait : styles.boardFrame}>
        <GestureDetector gesture={boardTap}>
          <View ref={boardRef} testID="craps-board" style={styles.board} onLayout={onBoardLayout}>
            {layout && (
              <>
                <CrapsFelt layout={layout} bets={bets} point={point} highlight={lit}
                  quality={assistEnabled ? quality : undefined} payoutRings={assistEnabled} fieldPays3on12={tableRules.fieldPays3on12} />
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
          <View testID="craps-dice" style={[styles.dice, {
            left: layout.diceRect.x, top: layout.diceRect.y, width: layout.diceRect.w, height: layout.diceRect.h,
          }]}>
            <FitBox width={Math.max(0, layout.diceRect.w - ROLL_W - 3 * DICE_GAP)} height={layout.diceRect.h - 2 * DICE_GAP}>
              <DiceDisplay dice={dice} point={point} compact />
            </FitBox>
            <RollButton testID="craps-roll" onRoll={handleRoll} disabled={bets.length === 0 || rolling !== null} style={styles.roll} />
          </View>
        )}
        {layout && rolling && (
          <RollOverlay dice={rolling.dice} size={Math.round(Math.min(layout.height * 0.32, 120))} onDone={rollShown} />
        )}
      </View>
  )

  return (
    <View ref={rootRef} style={styles.root} onLayout={onRootLayout}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={styles.back} hitSlop={8} />
        <Text style={styles.title} numberOfLines={1}>CRAPS · {tableRules.oddsMultiple}</Text>
        {/* In landscape the reason line lives in the slim header so the felt keeps its height. */}
        {portrait ? <View style={styles.spacer} /> : reason}
        {/* Left of Assist, clear of its on/off dot. */}
        <InfoButton testID="assist-info-button" label="How to play and what Assist shows" onPress={() => setInfoOpen(true)} style={styles.info} />
        <TouchableOpacity onPress={toggleAssist} hitSlop={8}>
          <Text style={[styles.assist, assistEnabled && styles.assistOn]}>Assist {assistEnabled ? '●' : '○'}</Text>
        </TouchableOpacity>
        <FlashingBalance testID="craps-balance" value={balanceValue} color={isNegative ? NEGATIVE : BALANCE}
          style={styles.balance}>{balance}</FlashingBalance>
      </View>

      {portrait ? (
        <>
          {boardFrame}
          {/* Large portrait: the felt keeps its landscape shape at full width; the reason line and tray go below. */}
          <View testID="craps-table-below" style={styles.below}>
            <View style={styles.reasonRow}>{reason}</View>
            {tray}
          </View>
        </>
      ) : (
        <View style={styles.body}>
          {tray}
          {boardFrame}
        </View>
      )}

      {showBanner && (
        <RollResultBanner resolution={lastRoll} delta={lastDelta} onDismiss={() => setShowBanner(false)} />
      )}

      {menuBet && (
        <StackMenu bet={menuBet} phase={phase} point={point} rules={tableRules} assist={assistEnabled} onClose={() => setMenuBet(null)} />
      )}
      <MoreBetsSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
      <AssistInfo visible={infoOpen} view="table" onClose={() => setInfoOpen(false)} />

      {dragAmount !== null && (
        <Animated.View testID="chip-ghost" pointerEvents="none" style={[styles.ghost, ghostStyle]}>
          <ChipFace amount={dragAmount} size={chip} />
        </Animated.View>
      )}
    </View>
  )
}

function makeSheets(c: Record<TableSize, TableChrome>) {
  const regular = {
    root: { flex: 1, backgroundColor: '#13131f' },
    header: { height: c.regular.headerH, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12,
      borderBottomWidth: 1, borderColor: '#2a2a3e' },
    back: { color: '#aaa', fontSize: 14 },
    title: { color: '#FFD700', fontWeight: '700', fontSize: 14 },
    reason: { flex: 1, color: '#aaa', fontSize: 13, textAlign: 'center' },
    spacer: { flex: 1 },
    assist: { color: '#aaa', fontSize: 13 },
    info: { color: '#aaa', fontSize: 16 },
    assistOn: { color: '#FFD700' },
    dimmed: { opacity: 0.4 },
    balance: { fontWeight: '700', fontSize: 13 },
    body: { flex: 1, flexDirection: 'row' },
    boardFrame: { flex: 1, margin: c.regular.margin },
    // Large portrait: full width, landscape-shaped (tableFeltSize gives the same felt).
    boardFramePortrait: { margin: c.regular.margin, aspectRatio: 1 / PORTRAIT_FELT_RATIO },
    board: { flex: 1 },
    stackHandle: { position: 'absolute' },
    dice: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
      overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: '#0b3d26' },
    // A 44dp touch target that fits the shortest Pass Line band (68dp on the Fold cover).
    roll: { margin: 0, width: ROLL_W, minHeight: 44, paddingVertical: 10, paddingHorizontal: 0, justifyContent: 'center' },
    fitInner: { alignSelf: 'center' },
    // The chip column and Clear under it; the divider moves from the chips to the whole column.
    trayWrap: { width: c.regular.trayW, borderRightWidth: 1, borderColor: '#2a2a3e', alignItems: 'center',
      paddingBottom: 6 },
    tray: { width: c.regular.trayW, flex: 1, paddingHorizontal: 0, borderRightWidth: 0 },
    clear: { minHeight: 36, width: c.regular.trayW - 10, borderRadius: 6, backgroundColor: '#2a2a3e',
      alignItems: 'center', justifyContent: 'center' },
    clearText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    below: { flex: 1 },
    reasonRow: { height: c.regular.reasonH, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
    trayRowWrap: { height: c.regular.trayRowH, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1,
      borderColor: '#2a2a3e', paddingRight: 12 },
    trayRow: { flex: 1, height: c.regular.trayRowH, paddingVertical: 0, borderTopWidth: 0 },
    // Slightly see-through so the highlighted area shows through the chip.
    ghost: { position: 'absolute', left: 0, top: 0, opacity: 0.8 },
  } as const
  return sizedStyles(StyleSheet.create(regular), {
    header: { height: c.large.headerH, gap: 16, paddingHorizontal: 16 },
    back: { fontSize: 17 },
    title: { fontSize: 17 },
    reason: { fontSize: 15 },
    assist: { fontSize: 15 },
    info: { fontSize: 19 },
    balance: { fontSize: 16 },
    trayWrap: { width: c.large.trayW },
    tray: { width: c.large.trayW },
    clear: { minHeight: 44, width: c.large.trayW - 12, paddingHorizontal: 12 },
    clearText: { fontSize: 16 },
    reasonRow: { height: c.large.reasonH },
    trayRowWrap: { height: c.large.trayRowH },
    trayRow: { height: c.large.trayRowH },
  })
}

const SHEETS = makeSheets(TABLE_CHROME)
