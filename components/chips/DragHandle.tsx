import React, { useRef } from 'react'
import { View, StyleProp, ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { SharedValue, useSharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { ChipSource, Point, TAP_MAX_MS, dragPoint, fingerInWindow } from './chips'

export type ChipGhost = { x: SharedValue<number>; y: SharedValue<number>; origin: SharedValue<Point> }

/** The drag callbacks `useChipTable` returns, spread onto each DragHandle. Points are window coordinates. */
export type ChipHandlers = {
  ghost: ChipGhost
  onBegin(source: ChipSource, absX: number, absY: number): void
  onMove(absX: number, absY: number): void
  onDrop(success: boolean, absX: number, absY: number): void
  onFinish(): void
}

export type DragHandleProps = ChipHandlers & {
  source: ChipSource
  /** Tray chips: a tap (no movement) selects the chip for tap-to-place. Stacks have no tap; the board's tap covers them. */
  onTap?: () => void
  selected?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
  children?: React.ReactNode
}

export function DragHandle({ source, ghost, onBegin, onMove, onDrop, onFinish, onTap, selected, style, testID, children }: DragHandleProps) {
  const selfRef = useRef<React.ComponentRef<typeof View>>(null)
  // This handle's window origin, in the same measureInWindow frame as the board and root origins.
  const self = useSharedValue<Point>({ x: 0, y: 0 })
  const measureSelf = () => selfRef.current?.measureInWindow((x, y) => { self.value = { x, y } })

  const pan = Gesture.Pan()
    .minDistance(2)
    .withTestId(`drag-${testID ?? source.type}`)
    // Re-measure at touch-down: onLayout only fires when this handle moves within its parent, so a shift of
    // the whole tray (a late bottom inset, the Galaxy Fold taskbar) would leave a stale origin and draw the
    // chip under the finger. Pan activates after minDistance, so the fresh origin is in by then.
    .onBegin(() => {
      scheduleOnRN(measureSelf)
    })
    .onStart(e => {
      const p = dragPoint(fingerInWindow(self.value, { x: e.x, y: e.y }))
      ghost.x.value = p.x - ghost.origin.value.x
      ghost.y.value = p.y - ghost.origin.value.y
      scheduleOnRN(onBegin, source, p.x, p.y)
    })
    .onUpdate(e => {
      const p = dragPoint(fingerInWindow(self.value, { x: e.x, y: e.y }))
      ghost.x.value = p.x - ghost.origin.value.x
      ghost.y.value = p.y - ghost.origin.value.y
      scheduleOnRN(onMove, p.x, p.y)
    })
    // success is false when an active gesture was cancelled or failed; onDrop then does nothing.
    .onEnd((e, success) => {
      const p = dragPoint(fingerInWindow(self.value, { x: e.x, y: e.y }))
      scheduleOnRN(onDrop, success, p.x, p.y)
    })
    // Runs on every outcome (end, cancel, fail), so the ghost and highlight are always cleared.
    .onFinalize(() => {
      scheduleOnRN(onFinish)
    })
  // Raced against the pan: a finger that moves 2px+ drags, one that lifts without moving taps.
  const gesture = onTap
    ? Gesture.Race(pan, Gesture.Tap().maxDuration(TAP_MAX_MS).withTestId(`tap-${testID ?? source.type}`).onEnd((_e, success) => {
        if (success) scheduleOnRN(onTap)
      }))
    : pan
  return (
    <GestureDetector gesture={gesture}>
      <View ref={selfRef} testID={testID} style={style} onLayout={measureSelf}
        accessibilityState={onTap ? { selected: !!selected } : undefined}>{children}</View>
    </GestureDetector>
  )
}
