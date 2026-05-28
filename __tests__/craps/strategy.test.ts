import { getBetQuality } from '../../features/craps/strategy'

describe('getBetQuality', () => {
  test('pass with max odds → optimal', () => {
    expect(getBetQuality('pass', true, true)).toBe('optimal')
  })
  test('pass with odds but not max → acceptable', () => {
    expect(getBetQuality('pass', true, false)).toBe('acceptable')
  })
  test('pass without odds → acceptable', () => {
    expect(getBetQuality('pass', false, false)).toBe('acceptable')
  })
  test('come with max odds → optimal', () => {
    expect(getBetQuality('come', true, true)).toBe('optimal')
  })
  test('dont-pass with max lay odds → optimal', () => {
    expect(getBetQuality('dont-pass', true, true)).toBe('optimal')
  })
  test('place 6/8 → acceptable', () => {
    expect(getBetQuality('place', false, false)).toBe('acceptable')
  })
  test('place 4/5/9/10 → poor', () => {
    expect(getBetQuality('place', false, false, 4)).toBe('poor')
    expect(getBetQuality('place', false, false, 9)).toBe('poor')
  })
  test('field → poor', () => {
    expect(getBetQuality('field', false, false)).toBe('poor')
  })
  test('big6 → poor', () => {
    expect(getBetQuality('big6', false, false)).toBe('poor')
  })
  test('any-7 → avoid', () => {
    expect(getBetQuality('any-7', false, false)).toBe('avoid')
  })
  test('horn → avoid', () => {
    expect(getBetQuality('horn', false, false)).toBe('avoid')
  })
  test('hop-easy → avoid', () => {
    expect(getBetQuality('hop-easy', false, false)).toBe('avoid')
  })
  test('hardway → avoid', () => {
    expect(getBetQuality('hardway', false, false)).toBe('avoid')
  })
  test('low-field → avoid', () => {
    expect(getBetQuality('low-field', false, false)).toBe('avoid')
  })
  test('high-field → avoid', () => {
    expect(getBetQuality('high-field', false, false)).toBe('avoid')
  })
})
