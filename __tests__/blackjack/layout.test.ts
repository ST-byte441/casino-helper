import { pickLayout } from '../../features/blackjack/layout'

test('phones always get the phone layout, whatever the orientation', () => {
  expect(pickLayout('compact', 'portrait')).toBe('phone')
  expect(pickLayout('regular', 'portrait')).toBe('phone')
  expect(pickLayout('regular', 'landscape')).toBe('phone')
})

test('large screens pick by orientation', () => {
  expect(pickLayout('large', 'portrait')).toBe('largePortrait')
  expect(pickLayout('large', 'landscape')).toBe('largeLandscape')
})
