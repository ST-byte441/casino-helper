import React, { useEffect, useMemo, useRef } from 'react'
import { Pressable, View, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import Animated, {
  Easing, SharedValue, useAnimatedProps, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming,
} from 'react-native-reanimated'
import {
  DEFAULT_DICE_COLORS, DiceColors, DieFrame, Spin, faceRgb, projectDie, randomSpin, throwOffset, tumbleOrientation,
} from '../dice3d'

/*
 * The craps roll (table and list views), seen from directly above the table: two 3D dice thrown in from the right,
 * tumbling and bouncing (bigger while in the air, their shadows falling away) to a stop square-on to the viewer on
 * the rolled values, then resting there for REST_MS so the result can be read. The store has already rolled; this
 * is presentation only. A tap skips it.
 *
 * One progress value (0 → 1, eased) drives both dice. Each frame a die's rotation (the spin unwinding to its rest
 * orientation, dice3d.ts) is projected on the UI thread to SVG paths: the faces turned toward the viewer, each a
 * shade of the dice colour (no outline), and their pips. The rolled face is front-most from ~98% of the tumble on.
 */

/** The throw: dice fly in, tumble and bounce to a stop. */
export const TUMBLE_MS = 1000
/** How long the dice rest on the result before the banner, so the player can read it. */
export const REST_MS = 1200
/** How long the overlay stays up before the result banner. */
export const ROLL_ANIM_MS = TUMBLE_MS + REST_MS

const AnimatedPath = Animated.createAnimatedComponent(Path)

type Props = {
  dice: [number, number]
  /** The die's edge length. */
  size: number
  /** Dice and pip colours; a future dice-colour setting passes its choice here. */
  colors?: DiceColors
  onDone(): void
}

function FacePath({ frame, index }: { frame: SharedValue<DieFrame>; index: number }) {
  const props = useAnimatedProps(() => ({ d: frame.value.faces[index].d, fill: frame.value.faces[index].fill }))
  return <AnimatedPath animatedProps={props} />
}

function ThrownDie({ value, index, size, colors, progress }: {
  value: number; index: number; size: number; colors: DiceColors; progress: SharedValue<number>
}) {
  const spin = useMemo<Spin>(() => randomSpin(), [value])
  // The second die comes in a little further out and lower, so the two don't move as one.
  const dx = size * (index === 0 ? 3.6 : 4.4)
  const dy = size * (index === 0 ? 0.9 : 1.3)
  const box = size * 2
  const rgb = useMemo(() => faceRgb(colors.face), [colors.face])
  const frame = useDerivedValue(() => projectDie(tumbleOrientation(value, progress.value, spin), size, rgb))
  const pips = useAnimatedProps(() => ({ d: frame.value.pips }))
  // Seen from above, a die in the air is nearer the viewer: bigger, with its shadow further off down-right.
  const flying = useAnimatedStyle(() => {
    const o = throwOffset(progress.value, dx, dy)
    const air = Math.min(1, o.lift / size)
    return { transform: [{ translateX: o.x }, { translateY: o.y }, { scale: 1 + 0.35 * air }] }
  })
  const shadow = useAnimatedStyle(() => {
    const o = throwOffset(progress.value, dx, dy)
    const air = Math.min(1, o.lift / size)
    const off = size * (0.06 + 0.3 * air)
    return {
      opacity: 0.35 - 0.15 * air,
      transform: [{ translateX: o.x + off }, { translateY: o.y + off }, { scale: 1 - 0.15 * air }],
    }
  })
  const shadowSize = size * 0.96
  return (
    <View style={{ width: size * 1.4, height: size * 1.4, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[styles.shadow, {
        width: shadowSize, height: shadowSize, borderRadius: size * 0.14,
        left: (size * 1.4 - shadowSize) / 2, top: (size * 1.4 - shadowSize) / 2,
      }, shadow]} />
      <Animated.View testID={`roll-die-${index}`} accessibilityLabel={`Die showing ${value}`}
        style={[{ width: box, height: box }, flying]}>
        <Svg width={box} height={box} viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}>
          {[0, 1, 2, 3, 4, 5].map(i => <FacePath key={i} frame={frame} index={i} />)}
          <AnimatedPath animatedProps={pips} fill={colors.pips} />
        </Svg>
      </Animated.View>
    </View>
  )
}

export function RollOverlay({ dice, size, colors = DEFAULT_DICE_COLORS, onDone }: Props) {
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
        <ThrownDie value={dice[0]} index={0} size={size} colors={colors} progress={progress} />
        <ThrownDie value={dice[1]} index={1} size={size} colors={colors} progress={progress} />
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
