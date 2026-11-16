import React, { useEffect, useMemo, useRef } from 'react'
import { Pressable, View, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import Animated, {
  Easing, SharedValue, useAnimatedProps, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming,
} from 'react-native-reanimated'
import { DieFrame, Spin, projectDie, randomSpin, throwOffset, tumbleOrientation } from '../dice3d'

/*
 * The craps roll (table and list views): two 3D dice thrown in from the right, tumbling and bouncing to a stop on the rolled values, then
 * resting there for REST_MS so the result can be read. The store has already rolled; this is presentation only.
 * A tap skips it.
 *
 * One progress value (0 → 1, eased) drives both dice. Each frame a die's rotation (the spin unwinding to its rest
 * orientation, dice3d.ts) is projected on the UI thread to SVG paths: a darker body for the bevelled edges, the lit
 * faces turned toward the viewer, and their pips. The rolled face is front-most from ~98% of the tumble on.
 */

/** The throw: dice fly in, tumble and bounce to a stop. */
export const TUMBLE_MS = 1000
/** How long the dice rest on the result before the banner, so the player can read it. */
export const REST_MS = 1200
/** How long the overlay stays up before the result banner. */
export const ROLL_ANIM_MS = TUMBLE_MS + REST_MS

const AnimatedPath = Animated.createAnimatedComponent(Path)
const BODY = '#b9b3a6'
const PIP = '#13131f'

type Props = {
  dice: [number, number]
  /** The die's edge length. */
  size: number
  onDone(): void
}

function FacePath({ frame, index }: { frame: SharedValue<DieFrame>; index: number }) {
  const props = useAnimatedProps(() => ({ d: frame.value.faces[index].d, fill: frame.value.faces[index].fill }))
  return <AnimatedPath animatedProps={props} />
}

function ThrownDie({ value, index, size, progress }: {
  value: number; index: number; size: number; progress: SharedValue<number>
}) {
  const spin = useMemo<Spin>(() => randomSpin(), [value])
  // The second die comes in a little further out and lower, so the two don't move as one.
  const dx = size * (index === 0 ? 3.6 : 4.4)
  const dy = size * (index === 0 ? 0.9 : 1.3)
  const box = size * 2
  const frame = useDerivedValue(() => projectDie(tumbleOrientation(value, progress.value, spin), size))
  const body = useAnimatedProps(() => ({ d: frame.value.body }))
  const pips = useAnimatedProps(() => ({ d: frame.value.pips }))
  const flying = useAnimatedStyle(() => {
    const o = throwOffset(progress.value, dx, dy)
    return { transform: [{ translateX: o.x }, { translateY: o.y - o.lift }] }
  })
  // The shadow stays on the felt, shrinking and fading while the die is in the air.
  const shadow = useAnimatedStyle(() => {
    const o = throwOffset(progress.value, dx, dy)
    const air = Math.min(1, o.lift / size)
    return { opacity: 0.45 - 0.25 * air, transform: [{ translateX: o.x }, { translateY: o.y }, { scale: 1 - 0.35 * air }] }
  })
  return (
    <View style={{ width: size * 1.4, height: size * 1.4, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[styles.shadow, {
        width: size * 1.2, height: size * 0.3, borderRadius: size, top: size * 1.05,
      }, shadow]} />
      <Animated.View testID={`roll-die-${index}`} accessibilityLabel={`Die showing ${value}`}
        style={[{ width: box, height: box }, flying]}>
        <Svg width={box} height={box} viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}>
          <AnimatedPath animatedProps={body} fill={BODY} />
          {[0, 1, 2, 3, 4, 5].map(i => <FacePath key={i} frame={frame} index={i} />)}
          <AnimatedPath animatedProps={pips} fill={PIP} />
        </Svg>
      </Animated.View>
    </View>
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
      <View style={[styles.row, { gap: size * 0.1 }]}>
        <ThrownDie value={dice[0]} index={0} size={size} progress={progress} />
        <ThrownDie value={dice[1]} index={1} size={size} progress={progress} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  shadow: { position: 'absolute', backgroundColor: '#000' },
})
