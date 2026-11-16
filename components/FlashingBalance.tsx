import React, { useEffect, useRef, useState } from 'react'
import { Animated, StyleProp, TextStyle } from 'react-native'
import { MAX_FONT_SCALE } from './Text'

export const FLASH_UP = 'rgba(46, 204, 113, 1)'
export const FLASH_DOWN = 'rgba(255, 85, 85, 1)'

type Props = {
  /** The number shown; null (infinite bankroll, no profile) never flashes. */
  value: number | null
  /** The text's normal colour. */
  color: string
  style?: StyleProp<TextStyle>
  testID?: string
  children: React.ReactNode
}

/** Balance text that flashes green when `value` rises and red when it drops (~0.9 s), then settles back. */
export function FlashingBalance({ value, color, style, testID, children }: Props) {
  const flash = useRef(new Animated.Value(0)).current
  const prev = useRef(value)
  const [tint, setTint] = useState(FLASH_UP)

  useEffect(() => {
    const before = prev.current
    prev.current = value
    if (value == null || before == null || value === before) return
    setTint(value > before ? FLASH_UP : FLASH_DOWN)
    flash.stopAnimation()
    flash.setValue(0)
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.delay(400),
      Animated.timing(flash, { toValue: 0, duration: 350, useNativeDriver: false }),
    ]).start()
  }, [value])

  const animated = flash.interpolate({ inputRange: [0, 1], outputRange: [color, tint] })
  return (
    <Animated.Text testID={testID} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[style, { color: animated }]}>
      {children}
    </Animated.Text>
  )
}
