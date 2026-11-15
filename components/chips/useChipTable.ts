import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, LayoutChangeEvent } from 'react-native'
import { Gesture } from 'react-native-gesture-handler'
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { CHIP_SIZE, ChipSource, Point, TAP_FLASH_MS, TAP_MAX_MS } from './chips'
import { ChipHandlers } from './DragHandle'

type Options = {
  /** The bet under board-local point (x, y), or null. Called only once the board has been laid out. */
  hit(x: number, y: number): string | null
  /**
   * A drag that ended successfully. `target` is `hit` at the drop point; `offBoard` is true when the point is
   * outside the board's frame. Not called for a cancelled or failed gesture (the chip goes back).
   */
  onDrop(source: ChipSource, target: string | null, offBoard: boolean): void
  /** A tap on the board, at board-local (x, y). */
  onTapPoint(x: number, y: number): void
  /** A stack's current total, for the dragged ghost chip. */
  stackAmount(id: string): number
}

/**
 * The game-agnostic half of a chip table: the root and board origins (measureInWindow), the dragged ghost chip,
 * the hover highlight and tap flash, and the board's tap gesture. Window points from DragHandle are converted to
 * board-local points before `hit` and `onDrop`. Put `rootRef`/`onRootLayout` on the view the ghost is drawn in
 * and `boardRef`/`onBoardLayout` on the board drawing area (with `boardTap`'s detector on it).
 */
export function useChipTable({ hit, onDrop, onTapPoint, stackAmount }: Options) {
  const [boardSize, setBoardSize] = useState<{ w: number; h: number } | null>(null)
  const rootRef = useRef<React.ComponentRef<typeof View>>(null)
  const boardRef = useRef<React.ComponentRef<typeof View>>(null)
  const boardOrigin = useRef<Point>({ x: 0, y: 0 })
  const dragSource = useRef<ChipSource | null>(null)
  const [drag, setDrag] = useState<{ amount: number } | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const ghost = { x: useSharedValue(0), y: useSharedValue(0), origin: useSharedValue<Point>({ x: 0, y: 0 }) }

  const measure = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) => { boardOrigin.current = { x, y } })
    rootRef.current?.measureInWindow((x, y) => { ghost.origin.value = { x, y } })
  }, [ghost.origin])

  function onBoardLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout
    if (!boardSize || boardSize.w !== width || boardSize.h !== height) setBoardSize({ w: width, h: height })
    measure()
  }

  const toLocal = (absX: number, absY: number) => ({
    x: absX - boardOrigin.current.x,
    y: absY - boardOrigin.current.y,
  })

  function onBegin(source: ChipSource, _absX: number, _absY: number) {
    measure()
    dragSource.current = source
    const amount = source.type === 'tray' ? source.amount : stackAmount(source.id)
    setDrag({ amount })
  }

  function onMove(absX: number, absY: number) {
    if (!boardSize) return
    const { x, y } = toLocal(absX, absY)
    const id = hit(x, y)
    setHighlight(prev => (prev === id ? prev : id))
  }

  function onDropAt(success: boolean, absX: number, absY: number) {
    const source = dragSource.current
    if (!success || !boardSize || !source) return
    const { x, y } = toLocal(absX, absY)
    const offBoard = x < 0 || x > boardSize.w || y < 0 || y > boardSize.h
    onDrop(source, hit(x, y), offBoard)
  }

  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  /** Lights `key` briefly, as after a tap-placed bet. */
  function flash(key: string) {
    setHighlight(key)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setHighlight(null), TAP_FLASH_MS)
  }

  // Board-local point: the tap's detector is on the measured board view itself.
  const boardTap = Gesture.Tap().maxDuration(TAP_MAX_MS).withTestId('tap-board').onEnd((e, success) => {
    if (success) scheduleOnRN(onTapPoint, e.x, e.y)
  })

  function onFinish() {
    // A pan also finalizes after a plain tap; with no drag under way there's nothing to clear (and a tap's flash stays).
    if (dragSource.current === null) return
    dragSource.current = null
    setDrag(null)
    setHighlight(null)
  }

  const handlers: ChipHandlers = { ghost, onBegin, onMove, onDrop: onDropAt, onFinish }
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ghost.x.value - CHIP_SIZE / 2 }, { translateY: ghost.y.value - CHIP_SIZE / 2 }],
  }))

  return {
    rootRef, boardRef, onRootLayout: measure, onBoardLayout, boardSize,
    handlers, ghost, ghostStyle, dragAmount: drag ? drag.amount : null,
    highlight, flash, boardTap,
  }
}
