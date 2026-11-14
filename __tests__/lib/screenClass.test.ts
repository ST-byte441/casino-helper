import { getScreenClass } from '../../lib/screenClass'

test('narrow cover screens are compact', () => {
  expect(getScreenClass(320, 700)).toEqual({ sizeClass: 'compact', orientation: 'portrait' })
})

test('compact/regular boundary is exactly 360dp', () => {
  expect(getScreenClass(359, 800).sizeClass).toBe('compact')
  expect(getScreenClass(360, 800).sizeClass).toBe('regular')
})

test('an S23 Ultra is regular portrait', () => {
  expect(getScreenClass(384, 832)).toEqual({ sizeClass: 'regular', orientation: 'portrait' })
})

test('a phone on its side stays regular (class uses the shorter side)', () => {
  expect(getScreenClass(832, 384)).toEqual({ sizeClass: 'regular', orientation: 'landscape' })
})

test('regular/large boundary is exactly 600dp', () => {
  expect(getScreenClass(599, 900).sizeClass).toBe('regular')
  expect(getScreenClass(600, 900).sizeClass).toBe('large')
})

test('a Fold inner screen held sideways is large landscape', () => {
  expect(getScreenClass(884, 673)).toEqual({ sizeClass: 'large', orientation: 'landscape' })
})
