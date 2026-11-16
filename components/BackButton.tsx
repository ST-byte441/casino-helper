import React from 'react'
import { Platform, StyleProp, StyleSheet, TextStyle, TouchableOpacity, useWindowDimensions } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { MAX_FONT_SCALE, Text } from './Text'

/** The arrow's box and stroke, in ems of the label's font size. */
export const ARROW = { width: 0.8, height: 0.62, stroke: 0.09, gap: 0.27 }

/**
 * How far (in ems, + is down) the middle of a capital sits from the middle of the text's line box, measured from
 * Roboto's metrics: on Android (font padding on, React Native's default) the cap middle is 0.037em below the box
 * centre; with the ascender/descender box (iOS) it is 0.014em above. Moving the arrow by this puts its middle on the
 * middle of the "B".
 */
export const CAP_MIDDLE_OFFSET = { android: 0.037, other: -0.014 }

type Props = {
  onPress(): void
  /** The label's text style: its colour and font size also size and colour the arrow. */
  style: StyleProp<TextStyle>
  testID?: string
  hitSlop?: number
}

/**
 * "Back" with an arrow, for every screen header. The arrow is drawn, not the left-arrow character: a glyph sits at
 * its font's own height (about the middle of lowercase letters), so it read low next to "Back". The drawn arrow is
 * centred on the text's line and then moved by CAP_MIDDLE_OFFSET (under a pixel), so its middle is on the middle
 * of the "B". Roboto has no left-arrow glyph at all; Android drew it from a fallback font, hence the drift.
 */
export function BackButton({ onPress, style, testID, hitSlop }: Props) {
  const { fontScale } = useWindowDimensions()
  const flat = StyleSheet.flatten(style) ?? {}
  const color = typeof flat.color === 'string' ? flat.color : '#fff'
  // The label grows with the system font size up to the Text cap; the arrow grows with it.
  const em = (flat.fontSize ?? 15) * Math.min(fontScale || 1, MAX_FONT_SCALE)
  const r = (n: number) => Math.round(n * 100) / 100
  const w = r(em * ARROW.width)
  const h = r(em * ARROW.height)
  const sw = r(Math.max(1.25, em * ARROW.stroke))
  const pad = r(sw / 2)
  const mid = r(h / 2)
  const head = r(h / 2 + pad)
  return (
    <TouchableOpacity testID={testID} onPress={onPress} hitSlop={hitSlop}
      style={[styles.row, { gap: r(em * ARROW.gap) }]}>
      <Svg testID={testID ? `${testID}-arrow` : 'back-arrow'} width={w} height={h} viewBox={`0 0 ${w} ${h}`}
        style={{ transform: [{ translateY: r(em * (Platform.OS === 'android' ? CAP_MIDDLE_OFFSET.android : CAP_MIDDLE_OFFSET.other)) }] }}>
        <Path
          d={`M${r(w - pad)} ${mid} H${pad} M${head} ${pad} L${pad} ${mid} L${head} ${r(h - pad)}`}
          stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      </Svg>
      <Text style={style}>Back</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
})
