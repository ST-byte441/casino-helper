import React, { useCallback, useMemo, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { RouletteWheel } from '../../../lib/types'
import { ROULETTE_CHIPS } from '../../../lib/constants'
import { totalStake } from '../engine'
import { BoardLayout, BoardOrientation, DragSource, DropAction, buildLayout, hitTest, resolveDrop } from '../layout'
import { useRouletteStore } from '../store'
import { Board, CHIP_COLORS, STACK_SIZE, stackChip } from './Board'

type Props = { wheel: RouletteWheel; orientation: BoardOrientation; onSpin(): void }

const CHIP_SIZE = 44

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

type Point = { x: number; y: number }

type HandleProps = {
  source: DragSource
  ghost: { x: SharedValue<number>; y: SharedValue<number>; origin: SharedValue<Point> }
  onBegin(source: DragSource, absX: number, absY: number): void
  onMove(absX: number, absY: number): void
  onDrop(absX: number, absY: number): void
  onFinish(): void
  style?: StyleProp<ViewStyle>
  testID?: string
  children?: React.ReactNode
}

function DragHandle({ source, ghost, onBegin, onMove, onDrop, onFinish, style, testID, children }: HandleProps) {
  const pan = Gesture.Pan()
    .minDistance(2)
    .onStart(e => {
      ghost.x.value = e.absoluteX - ghost.origin.value.x
      ghost.y.value = e.absoluteY - ghost.origin.value.y
      scheduleOnRN(onBegin, source, e.absoluteX, e.absoluteY)
    })
    .onUpdate(e => {
      ghost.x.value = e.absoluteX - ghost.origin.value.x
      ghost.y.value = e.absoluteY - ghost.origin.value.y
      scheduleOnRN(onMove, e.absoluteX, e.absoluteY)
    })
    .onEnd(e => {
      scheduleOnRN(onDrop, e.absoluteX, e.absoluteY)
    })
    .onFinalize(() => {
      scheduleOnRN(onFinish)
    })
  return (
    <GestureDetector gesture={pan}>
      <View testID={testID} style={style}>{children}</View>
    </GestureDetector>
  )
}

function ChipFace({ amount, size }: { amount: number; size: number }) {
  const c = CHIP_COLORS[stackChip(amount)]
  return (
    <View style={[styles.chip, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.fg }]} numberOfLines={1} adjustsFontSizeToFit>${amount}</Text>
    </View>
  )
}

export function BettingTable({ wheel, orientation, onSpin }: Props) {
  const bets = useRouletteStore(s => s.bets)
  const marker = useRouletteStore(s => s.marker)
  const spinError = useRouletteStore(s => s.spinError)
  const undo = useRouletteStore(s => s.undo)
  const clearBets = useRouletteStore(s => s.clearBets)
  const error = spinError()

  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const layout = useMemo<BoardLayout | null>(
    () => (size ? buildLayout(wheel, orientation, size.w, size.h) : null),
    [wheel, orientation, size],
  )

  const rootRef = useRef<React.ComponentRef<typeof View>>(null)
  const boardRef = useRef<React.ComponentRef<typeof View>>(null)
  const boardOrigin = useRef<Point>({ x: 0, y: 0 })
  const dragSource = useRef<DragSource | null>(null)
  const [drag, setDrag] = useState<{ amount: number } | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const ghost = { x: useSharedValue(0), y: useSharedValue(0), origin: useSharedValue<Point>({ x: 0, y: 0 }) }

  const measure = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) => { boardOrigin.current = { x, y } })
    rootRef.current?.measureInWindow((x, y) => { ghost.origin.value = { x, y } })
  }, [ghost.origin])

  function onBoardLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout
    if (!size || size.w !== width || size.h !== height) setSize({ w: width, h: height })
    measure()
  }

  const toLocal = (absX: number, absY: number) => ({
    x: absX - boardOrigin.current.x,
    y: absY - boardOrigin.current.y,
  })

  function onBegin(source: DragSource, _absX: number, _absY: number) {
    measure()
    dragSource.current = source
    const amount = source.type === 'tray' ? source.amount : useRouletteStore.getState().bets[source.betId] ?? 0
    setDrag({ amount })
  }

  function onMove(absX: number, absY: number) {
    if (!layout) return
    const { x, y } = toLocal(absX, absY)
    const inside = x >= 0 && x <= layout.width && y >= 0 && y <= layout.height
    const id = inside ? hitTest(layout, wheel, x, y) : null
    setHighlight(prev => (prev === id ? prev : id))
  }

  function onDrop(absX: number, absY: number) {
    const source = dragSource.current
    if (!layout || !source) return
    const { x, y } = toLocal(absX, absY)
    applyDrop(resolveDrop(layout, wheel, source, x, y))
  }

  function onFinish() {
    dragSource.current = null
    setDrag(null)
    setHighlight(null)
  }

  const handlers = { ghost, onBegin, onMove, onDrop, onFinish }
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ghost.x.value - CHIP_SIZE / 2 }, { translateY: ghost.y.value - CHIP_SIZE / 2 }],
  }))

  return (
    <View ref={rootRef} style={styles.root} onLayout={measure}>
      <View ref={boardRef} style={styles.boardArea} onLayout={onBoardLayout}>
        {layout && (
          <>
            <Board layout={layout} bets={bets} marker={marker} highlight={highlight} />
            {Object.keys(bets).map(id => {
              const a = layout.anchors[id]
              if (!a) return null
              return (
                <DragHandle
                  key={id}
                  source={{ type: 'stack', betId: id }}
                  {...handlers}
                  style={[styles.stackHandle, { left: a.x - STACK_SIZE / 2, top: a.y - STACK_SIZE / 2 }]}
                />
              )
            })}
          </>
        )}
      </View>

      <Text style={styles.error}>{error ?? ' '}</Text>

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

      <View style={styles.tray}>
        {ROULETTE_CHIPS.map(amount => (
          <DragHandle key={amount} testID={`chip-${amount}`} source={{ type: 'tray', amount }} {...handlers}>
            <ChipFace amount={amount} size={CHIP_SIZE} />
          </DragHandle>
        ))}
      </View>

      {drag && (
        <Animated.View pointerEvents="none" style={[styles.ghost, ghostStyle]}>
          <ChipFace amount={drag.amount} size={CHIP_SIZE} />
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#13131f' },
  boardArea: { flex: 1, margin: 8, backgroundColor: '#0f5132', borderRadius: 6, borderWidth: 1, borderColor: '#2a2a3e' },
  stackHandle: { position: 'absolute', width: STACK_SIZE, height: STACK_SIZE, borderRadius: STACK_SIZE / 2 },
  error: { color: '#aaa', fontSize: 13, textAlign: 'center', marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  ctrlBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#2a2a3e' },
  ctrlText: { color: '#fff', fontWeight: '600' },
  total: { flex: 1, color: '#FFD700', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  spinBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: 8, backgroundColor: '#FFD700' },
  spinBtnDisabled: { opacity: 0.4 },
  spinText: { color: '#000', fontWeight: '800', fontSize: 16 },
  tray: { flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 10, borderTopWidth: 1,
    borderColor: '#2a2a3e' },
  chip: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderStyle: 'dashed', borderColor: '#FFD700' },
  chipText: { fontWeight: '800', fontSize: 13 },
  ghost: { position: 'absolute', left: 0, top: 0 },
})
