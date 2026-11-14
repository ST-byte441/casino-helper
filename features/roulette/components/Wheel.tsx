import { useEffect, useRef, useState } from 'react'
import { LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from 'react-native'
import Svg, { Circle, G, Path, Polygon, Text as SvgText } from 'react-native-svg'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import { Pocket, RouletteSpeed, RouletteWheel } from '../../../lib/types'
import { pocketColor, pocketLabel, wheelSequence } from '../engine'
import { SPIN_MS, finalWheelRotation, pocketAngle } from '../wheelMath'
import { POCKET_BG } from './Board'

type Props = {
  wheel: RouletteWheel
  result: Pocket
  speed: RouletteSpeed
  onDone(): void
  /** Side of the square wheel in px. Defaults to the smaller side of the container. */
  size?: number
  /** Show the wheel already stopped on `result`, with no animation and no onDone (result phase). */
  frozen?: boolean
}

// Geometry in a 200 x 200 viewBox, scaled to `size`.
const VB = 200
const C = VB / 2
const RIM_R = 99
const TRACK_OUTER_R = 97
const TRACK_INNER_R = 82
const POCKET_OUTER_R = 81
const POCKET_INNER_R = 58
const LABEL_R = 72
const HUB_R = 40
const BALL_TRACK_R = 89.5
const BALL_POCKET_R = 63
const BALL_R = 3.6

const TURNS: Record<RouletteSpeed, number> = { slow: 5, fast: 2 }
// The ball goes round the track this many times (counter-clockwise) in slow mode, ending back at the top.
const BALL_TURNS = 8
// Slow mode: the ball rides the outer track until DROP_AT of the spin, then spirals inward until SETTLE_AT.
// Wheel and ball share the cubic ease-out, so their relative angle still moves by (1 - SETTLE_AT)^3 of the
// total relative travel (~4700 deg) after settling: 0.95 keeps that drift under 1 deg (0.9 gave ~4.7 deg,
// half a triple-zero pocket).
const DROP_AT = 0.55
const SETTLE_AT = 0.95

function xy(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)]
}

function point(r: number, deg: number): string {
  const [x, y] = xy(r, deg)
  return `${x.toFixed(3)} ${y.toFixed(3)}`
}

function wedgePath(a0: number, a1: number): string {
  return [
    `M ${point(POCKET_INNER_R, a0)}`,
    `L ${point(POCKET_OUTER_R, a0)}`,
    `A ${POCKET_OUTER_R} ${POCKET_OUTER_R} 0 0 1 ${point(POCKET_OUTER_R, a1)}`,
    `L ${point(POCKET_INNER_R, a1)}`,
    `A ${POCKET_INNER_R} ${POCKET_INNER_R} 0 0 0 ${point(POCKET_INNER_R, a0)}`,
    'Z',
  ].join(' ')
}

export function Wheel({ wheel, result, speed, onDone, size, frozen = false }: Props) {
  const window = useWindowDimensions()
  const [measured, setMeasured] = useState<number | null>(null)
  const side = size ?? measured ?? Math.min(window.width, window.height) * 0.8
  const scale = side / VB

  const finalRotation = finalWheelRotation(wheel, result, TURNS[speed])
  // In fast mode (and when frozen) the ball sits in the result pocket and turns with the wheel.
  const ballOnWheel = frozen || speed === 'fast'

  const rotation = useSharedValue(frozen ? finalRotation : 0)
  const ballAngle = useSharedValue(0)
  const ballRadius = useSharedValue(frozen ? BALL_POCKET_R : BALL_TRACK_R)

  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const doneRef = useRef(false)

  // Started once on mount: re-renders (new size after a rotation, new onDone identity) must not restart the spin.
  useEffect(() => {
    if (frozen) return
    const duration = SPIN_MS[speed]
    rotation.value = withTiming(finalRotation, { duration, easing: Easing.out(Easing.cubic) })
    if (speed === 'slow') {
      ballAngle.value = withTiming(-360 * BALL_TURNS, { duration, easing: Easing.out(Easing.cubic) })
      ballRadius.value = withDelay(
        duration * DROP_AT,
        withTiming(BALL_POCKET_R, { duration: duration * (SETTLE_AT - DROP_AT), easing: Easing.inOut(Easing.quad) }),
      )
    }
    // The JS timer, not the animation callback, decides when the spin is over.
    const id = setTimeout(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDoneRef.current()
    }, duration)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }))
  const ballOrbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${ballAngle.value}deg` }] }))
  const ballStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -ballRadius.value * scale }] }))

  const seq = wheelSequence(wheel)
  const n = seq.length
  const step = 360 / n
  const resultAngle = pocketAngle(wheel, result)
  const ballPx = BALL_R * 2 * scale

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    const next = Math.floor(Math.min(width, height))
    if (next > 0 && next !== measured) setMeasured(next)
  }

  return (
    <View style={size === undefined ? styles.fill : null} onLayout={size === undefined ? onLayout : undefined}>
      <View style={{ width: side, height: side }} testID="wheel">
        <Animated.View style={[StyleSheet.absoluteFill, wheelStyle]}>
          <Svg width={side} height={side} viewBox={`0 0 ${VB} ${VB}`}>
            <Circle cx={C} cy={C} r={RIM_R} fill="#5d3a1a" />
            <Circle cx={C} cy={C} r={TRACK_OUTER_R} fill="#2b1a0c" />
            <Circle cx={C} cy={C} r={TRACK_INNER_R} fill="#8a6a2f" />
            {seq.map((p, i) => {
              const a0 = i * step
              const mid = a0 + step / 2
              const [lx, ly] = xy(LABEL_R, mid)
              return (
                <G key={p}>
                  <Path d={wedgePath(a0, a0 + step)} fill={POCKET_BG[pocketColor(p)]} stroke="#d4af37" strokeWidth={0.4} />
                  <SvgText
                    testID={`pocket-${pocketLabel(p)}`}
                    x={lx}
                    y={ly}
                    fill="#fff"
                    fontSize={pocketLabel(p).length > 2 ? 5 : 6.5}
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="central"
                    transform={`rotate(${mid} ${lx} ${ly})`}
                  >
                    {pocketLabel(p)}
                  </SvgText>
                </G>
              )
            })}
            <Circle cx={C} cy={C} r={POCKET_INNER_R} fill="#7a5524" />
            <Circle cx={C} cy={C} r={HUB_R} fill="#a57a33" stroke="#d4af37" strokeWidth={1} />
            <Circle cx={C} cy={C} r={8} fill="#d4af37" />
            {ballOnWheel && (
              <G transform={`rotate(${resultAngle} ${C} ${C})`}>
                <Circle testID="wheel-ball" cx={C} cy={C - BALL_POCKET_R} r={BALL_R} fill="#fff" stroke="#999" strokeWidth={0.4} />
              </G>
            )}
          </Svg>
        </Animated.View>

        {!ballOnWheel && (
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, ballOrbitStyle]} pointerEvents="none">
            <Animated.View
              testID="wheel-ball"
              style={[styles.ball, { width: ballPx, height: ballPx, borderRadius: ballPx / 2 }, ballStyle]}
            />
          </Animated.View>
        )}

        <Svg style={StyleSheet.absoluteFill} width={side} height={side} viewBox={`0 0 ${VB} ${VB}`} pointerEvents="none">
          <Polygon testID="wheel-pointer" points={`${C - 5},0 ${C + 5},0 ${C},11`} fill="#FFD700" stroke="#13131f" strokeWidth={0.8} />
        </Svg>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ball: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#999' },
})
