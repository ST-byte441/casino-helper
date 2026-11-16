import React, { useEffect, useMemo, useRef } from 'react'
import { Pressable, View, StyleSheet } from 'react-native'
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { FACES } from '../DiceDisplay'

/*
 * The table view's roll: two large dice tumbling over the felt (faces cycling, a spin and a swell), landing on the
 * rolled values and resting there for REST_MS so the result can be read. The store has already rolled; this is
 * presentation only. A tap skips it.
 *
 * Each die draws all six faces stacked and shows one by opacity, driven by one progress value (0 → 1). The face
 * sequence starts and ends on the rolled value, so a frozen progress (the Jest mock, which never runs the
 * timing) still shows the roll, and a finished one always does.
 */

/** The tumble: faces cycling, spin and swell. */
export const TUMBLE_MS = 850
/** How long the dice rest on the result before the banner, so the player can read it. */
export const REST_MS = 1200
/** How long the overlay stays up before the result banner. */
export const ROLL_ANIM_MS = TUMBLE_MS + REST_MS
/**
 * Progress at which the rolled face comes up and stays. Earlier the last face only showed at progress 1, while
 * the eased spin had all but stopped on the face before it (always a different one) from ~470 ms: players read
 * that wrong face as the landing.
 */
export const LAND_AT = 0.8
/** Faces shown while tumbling, between the first and last (both the rolled value). */
const TUMBLE_FACES = 10

type Props = {
  dice: [number, number]
  /** The die's edge length. */
  size: number
  onDone(): void
}

/** [value, random faces…, value]: a new random face at each step. */
function tumbleFaces(value: number): number[] {
  const seq = [value]
  for (let i = 0; i < TUMBLE_FACES; i++) {
    let f = Math.ceil(Math.random() * 6) || 1
    if (f === seq[seq.length - 1]) f = (f % 6) + 1
    seq.push(f)
  }
  if (seq[seq.length - 1] === value) seq[seq.length - 1] = (value % 6) + 1
  seq.push(value)
  return seq
}

/** Index into a face sequence of length n at progress p: the last (rolled) face from LAND_AT on. */
export function faceIndexAt(p: number, n: number): number {
  'worklet'
  if (p >= LAND_AT) return n - 1
  return Math.min(n - 2, Math.floor((p / LAND_AT) * (n - 1)))
}

function FaceLayer({ face, faces, progress, size, testID }: {
  face: number; faces: number[]; progress: SharedValue<number>; size: number; testID: string
}) {
  const shown = useAnimatedStyle(() => {
    return { opacity: faces[faceIndexAt(progress.value, faces.length)] === face ? 1 : 0 }
  })
  const dot = size * 0.17
  return (
    <Animated.View testID={testID} style={[StyleSheet.absoluteFill, shown]}>
      {FACES[face].map(([fx, fy], i) => (
        <View key={i} style={[styles.dot, { width: dot, height: dot, borderRadius: dot / 2,
          left: fx * size - dot / 2, top: fy * size - dot / 2 }]} />
      ))}
    </Animated.View>
  )
}

function TumblingDie({ value, index, size, progress }: {
  value: number; index: number; size: number; progress: SharedValue<number>
}) {
  const faces = useMemo(() => tumbleFaces(value), [value])
  // Whole turns, so the die comes to rest square; the two dice spin opposite ways.
  const spin = index === 0 ? 720 : -720
  const tumble = useAnimatedStyle(() => {
    const p = progress.value
    return { transform: [{ rotate: `${p * spin}deg` }, { scale: 1 + 0.35 * Math.sin(p * Math.PI) }] }
  })
  return (
    <Animated.View testID={`roll-die-${index}`}
      style={[styles.die, { width: size, height: size, borderRadius: size * 0.16 }, tumble]}>
      {[1, 2, 3, 4, 5, 6].map(f => (
        <FaceLayer key={f} face={f} faces={faces} progress={progress} size={size} testID={`roll-die-${index}-face-${f}`} />
      ))}
    </Animated.View>
  )
}

export function RollOverlay({ dice, size, onDone }: Props) {
  const progress = useSharedValue(0)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    progress.value = withTiming(1, { duration: TUMBLE_MS, easing: Easing.out(Easing.cubic) })
    const t = setTimeout(() => done.current(), ROLL_ANIM_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <Pressable testID="craps-roll-overlay" accessibilityLabel={`Rolled ${dice[0]} and ${dice[1]}`}
      onPress={() => done.current()} style={styles.overlay}>
      <View style={[styles.row, { gap: size * 0.4 }]}>
        <TumblingDie value={dice[0]} index={0} size={size} progress={progress} />
        <TumblingDie value={dice[1]} index={1} size={size} progress={progress} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  die: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  dot: { position: 'absolute', backgroundColor: '#13131f' },
})
