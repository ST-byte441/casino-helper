import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { BaccaratRevealMode, Card } from '../../../lib/types'
import { cardFaceImage, CARD_FACE_ASPECT } from '../cardFaces'

type Props = {
  card: Card
  mode: BaccaratRevealMode
  onRevealed(): void
  /** Ref to an enclosing gesture-handler ScrollView that the squeeze drag must win over. */
  scrollRef?: React.RefObject<any>
}

const H = 186
const W = Math.round(H * CARD_FACE_ASPECT)
const RELEASE_THRESHOLD = 0.55
const PEEL_MS = 220
const FLIP_MS = 300
/** Short pause on the revealed face before handing off to the next card. */
const HOLD_MS = 350

function CardFace({ card }: { card: Card }) {
  return <Image testID="card-face" source={cardFaceImage(card)} style={styles.face} resizeMode="cover" />
}

function CardBack() {
  return (
    <View style={styles.back}>
      <View style={styles.backInner}>
        <Text style={styles.backMotif}>♦</Text>
      </View>
    </View>
  )
}

export function SqueezeCard({ card, mode, onRevealed, scrollRef }: Props) {
  const progress = useSharedValue(0) // squeeze: 0 = face-down, 1 = fully peeled
  const flip = useSharedValue(0) // flip: 0 = back, 1 = face
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const finish = useCallback((animMs: number) => {
    if (doneRef.current) return
    doneRef.current = true
    setDone(true)
    timer.current = setTimeout(onRevealed, animMs + HOLD_MS)
  }, [onRevealed])

  const completeSqueeze = useCallback(() => {
    progress.value = withTiming(1, { duration: PEEL_MS })
    finish(PEEL_MS)
  }, [finish, progress])

  useEffect(() => {
    if (mode !== 'flip') return
    flip.value = withTiming(1, { duration: FLIP_MS })
    finish(FLIP_MS)
  }, [mode, flip, finish])

  const pan = Gesture.Pan()
    .enabled(mode === 'squeeze' && !done)
    .onUpdate(e => {
      progress.value = Math.min(1, Math.max(0, -e.translationY / (H * 0.9)))
    })
    .onEnd(() => {
      if (progress.value > RELEASE_THRESHOLD) {
        scheduleOnRN(completeSqueeze)
      } else {
        progress.value = withSpring(0)
      }
    })
  if (scrollRef) pan.blocksExternalGesture(scrollRef)

  const backStyle = useAnimatedStyle(() => ({ height: (1 - progress.value) * H }))
  const curlStyle = useAnimatedStyle(() => {
    const lifted = progress.value * H
    return {
      top: H - lifted,
      height: Math.min(lifted * 0.35, 40),
      opacity: progress.value > 0 && progress.value < 1 ? 1 : 0,
    }
  })
  const flipStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.abs(1 - 2 * flip.value) }] }))
  const flipBackStyle = useAnimatedStyle(() => ({ opacity: flip.value < 0.5 ? 1 : 0 }))

  if (mode === 'flip') {
    return (
      <View style={styles.wrap}>
        <Animated.View style={[styles.card, flipStyle]}>
          <CardFace card={card} />
          <Animated.View style={[StyleSheet.absoluteFill, flipBackStyle]}>
            <CardBack />
          </Animated.View>
        </Animated.View>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>Drag up to squeeze</Text>
      <GestureDetector gesture={pan}>
        <View style={styles.card}>
          <CardFace card={card} />
          <Animated.View style={[styles.backClip, backStyle]}>
            <CardBack />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.curl, curlStyle]} />
        </View>
      </GestureDetector>
      <TouchableOpacity onPress={completeSqueeze} disabled={done} hitSlop={8}>
        <Text style={[styles.skip, done && styles.skipDone]}>Flip it ▸</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  hint: { color: '#FFD700', fontSize: 12, marginBottom: 6 },
  card: { width: W, height: H, borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' },
  face: { position: 'absolute', top: 0, left: 0, width: W, height: H, borderRadius: 10 },
  backClip: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  back: { width: W, height: H, backgroundColor: '#7a1f2b', borderRadius: 10, borderWidth: 3, borderColor: '#fff',
    padding: 6 },
  backInner: { flex: 1, borderWidth: 1, borderColor: '#c9a0a7', borderRadius: 6, backgroundColor: '#5c1520',
    alignItems: 'center', justifyContent: 'center' },
  backMotif: { color: '#c9a0a7', fontSize: 28 },
  curl: { position: 'absolute', left: 0, right: 0, backgroundColor: '#e6e6e6',
    borderTopWidth: 1, borderColor: '#bbb', shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4, shadowRadius: 5, elevation: 6 },
  skip: { color: '#aaa', fontSize: 13, marginTop: 10 },
  skipDone: { opacity: 0.4 },
})
