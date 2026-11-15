import React, { useMemo } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from '../../../components/Text'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { RouletteWheel } from '../../../lib/types'
import { ROULETTE_CHIPS } from '../../../lib/constants'
import { CHIP_SIZE, ChipSource, Point } from '../../../components/chips/chips'
import { ChipFace } from '../../../components/chips/ChipFace'
import { ChipTray } from '../../../components/chips/ChipTray'
import { DragHandle } from '../../../components/chips/DragHandle'
import { useChipTable } from '../../../components/chips/useChipTable'
import { totalStake } from '../engine'
import { BoardLayout, BoardOrientation, DragSource, DropAction, buildLayout, dropAction, hitTest, resolveDrop, tapTarget } from '../layout'
import { useRouletteStore } from '../store'
import { Board, STACK_SIZE } from './Board'

export { CHIP_SIZE, DRAG_LIFT, FINGERTIP_REACH, TAP_FLASH_MS, TAP_MAX_MS, dragPoint, fingerInWindow } from '../../../components/chips/chips'

type Props = { wheel: RouletteWheel; orientation: BoardOrientation; onSpin(): void }

/** Applies a resolved drop to the roulette store. */
export function applyDrop(action: DropAction): void {
  const s = useRouletteStore.getState()
  switch (action.type) {
    case 'place': s.placeChip(action.betId, action.amount); break
    case 'move': s.moveStack(action.from, action.to); break
    case 'remove': s.removeStack(action.betId); break
    case 'none': break
  }
}

/**
 * What a drag that just ended does. A gesture that was cancelled or failed (system cancel, rotation, handler
 * dropped on remount) does nothing, so the chip goes back to where it came from. `origin` is the board's
 * window position; the finger's window point (see `fingerInWindow`) is converted to board coordinates
 * before hit-testing.
 */
export function dragEndAction(args: {
  success: boolean
  layout: BoardLayout | null
  wheel: RouletteWheel
  source: DragSource | null
  origin: Point
  absX: number
  absY: number
}): DropAction {
  const { success, layout, wheel, source, origin, absX, absY } = args
  if (!success || !layout || !source) return { type: 'none' }
  return resolveDrop(layout, wheel, source, absX - origin.x, absY - origin.y)
}

export function BettingTable({ wheel, orientation, onSpin }: Props) {
  const bets = useRouletteStore(s => s.bets)
  const marker = useRouletteStore(s => s.marker)
  const spinError = useRouletteStore(s => s.spinError)
  const reason = useRouletteStore(s => s.reason)
  // Subscribed so the reason line re-renders when a chip is rejected for balance.
  useRouletteStore(s => s.notice)
  const selectedChip = useRouletteStore(s => s.selectedChip)
  const selectChip = useRouletteStore(s => s.selectChip)
  const undo = useRouletteStore(s => s.undo)
  const clearBets = useRouletteStore(s => s.clearBets)
  const error = spinError()
  const reasonText = reason()

  /** A ChipSource in the roulette layout's terms. */
  const toDragSource = (c: ChipSource): DragSource =>
    c.type === 'tray' ? c : { type: 'stack', betId: c.id }

  // The hook only calls `hit` once the board is laid out, so `layout` is set whenever these run.
  const table = useChipTable({
    hit(x, y) {
      if (!layout) return null
      const inside = x >= 0 && x <= layout.width && y >= 0 && y <= layout.height
      return inside ? hitTest(layout, wheel, x, y) : null
    },
    onDrop(source, target, offBoard) {
      applyDrop(dropAction(toDragSource(source), target, offBoard))
    },
    onTapPoint(x, y) {
      const s = useRouletteStore.getState()
      if (!layout || s.selectedChip === null) return
      const id = tapTarget(layout, wheel, s.bets, x, y, STACK_SIZE / 2)
      if (!id || !s.placeChip(id, s.selectedChip)) return
      table.flash(id)
    },
    stackAmount: id => useRouletteStore.getState().bets[id] ?? 0,
  })
  const { rootRef, boardRef, onRootLayout, onBoardLayout, boardSize: size, handlers, ghostStyle, dragAmount,
    highlight, boardTap } = table
  const layout = useMemo<BoardLayout | null>(
    () => (size ? buildLayout(wheel, orientation, size.w, size.h) : null),
    [wheel, orientation, size],
  )

  return (
    <View ref={rootRef} style={styles.root} onLayout={onRootLayout}>
      {/* The border sits on a wrapper so the measured view's frame is exactly the board drawing area. */}
      <View style={styles.boardFrame}>
        <GestureDetector gesture={boardTap}>
        <View ref={boardRef} testID="roulette-board" style={styles.boardArea} onLayout={onBoardLayout}>
          {layout && (
            <>
              <Board wheel={wheel} layout={layout} bets={bets} marker={marker} highlight={highlight} />
              {Object.keys(bets).map(id => {
                const a = layout.anchors[id]
                if (!a) return null
                return (
                  <DragHandle
                    key={id}
                    source={{ type: 'stack', id }}
                    {...handlers}
                    style={[styles.stackHandle, { left: a.x - STACK_SIZE / 2, top: a.y - STACK_SIZE / 2 }]}
                  />
                )
              })}
            </>
          )}
        </View>
        </GestureDetector>
      </View>

      <Text style={styles.error}>{reasonText ?? ' '}</Text>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={undo}>
          <Text style={styles.ctrlText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={clearBets}>
          <Text style={styles.ctrlText}>Clear</Text>
        </TouchableOpacity>
        <Text style={styles.total}>Bet ${totalStake(bets)}</Text>
        <TouchableOpacity
          testID="roulette-spin"
          style={[styles.spinBtn, error !== null && styles.spinBtnDisabled]}
          disabled={error !== null}
          onPress={onSpin}
        >
          <Text style={styles.spinText}>Spin</Text>
        </TouchableOpacity>
      </View>

      <ChipTray chips={ROULETTE_CHIPS} selected={selectedChip} onSelect={selectChip} handlers={handlers} />

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
  boardFrame: { flex: 1, margin: 8, backgroundColor: '#0f5132', borderRadius: 6, borderWidth: 1, borderColor: '#2a2a3e' },
  boardArea: { flex: 1 },
  stackHandle: { position: 'absolute', width: STACK_SIZE, height: STACK_SIZE, borderRadius: STACK_SIZE / 2 },
  error: { color: '#aaa', fontSize: 13, textAlign: 'center', marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  ctrlBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#2a2a3e' },
  ctrlText: { color: '#fff', fontWeight: '600' },
  total: { flex: 1, color: '#FFD700', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  spinBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: 8, backgroundColor: '#FFD700' },
  spinBtnDisabled: { opacity: 0.4 },
  spinText: { color: '#000', fontWeight: '800', fontSize: 16 },
  // Slightly see-through so the highlighted spot on a line or corner shows through the chip.
  ghost: { position: 'absolute', left: 0, top: 0, opacity: 0.8 },
})
