'use strict'
// Minimal stand-in for react-native-reanimated in Jest.
// Reanimated 4.7's own mock (`react-native-reanimated/mock`) throws during init under jest-expo ("`setCSSEventHandler` is not available in JSReanimated"), so tests that render animated components use this instead. It covers only the APIs the app uses.
const { View } = require('react-native')

const useSharedValue = initial => {
  const React = require('react')
  return React.useRef({ value: initial }).current
}
const useAnimatedStyle = updater => updater()
const withTiming = toValue => toValue
const withSpring = toValue => toValue

// gesture-handler wraps its detector with createAnimatedComponent and probes a few hooks.
const Animated = { View, createAnimatedComponent: Component => Component }
const isSharedValue = v => typeof v === 'object' && v !== null && 'value' in v
const useEvent = handler => handler
const useHandler = () => ({ context: {}, doDependenciesDiffer: false, useWeb: false })

module.exports = {
  __esModule: true,
  default: Animated,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  isSharedValue,
  useEvent,
  useHandler,
}
