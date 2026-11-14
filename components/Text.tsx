import React from 'react'
import { Text as RNText, TextInput as RNTextInput } from 'react-native'

/**
 * How far the phone's font-size setting may enlarge text. Uncapped, large system fonts break
 * fixed-size rows. React 19 ignores defaultProps on function components, so the cap lives in
 * these wrappers: import Text/TextInput from here, never from react-native (a test enforces it).
 */
export const MAX_FONT_SCALE = 1.3

// React 19 passes `ref` as a regular prop, so spreading props forwards it.
export function Text(props: React.ComponentPropsWithRef<typeof RNText>) {
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />
}

export function TextInput(props: React.ComponentPropsWithRef<typeof RNTextInput>) {
  return <RNTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />
}
