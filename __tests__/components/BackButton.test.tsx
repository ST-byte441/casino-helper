import fs from 'fs'
import path from 'path'
import React from 'react'
import { StyleSheet } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { BackButton, ARROW, CAP_MIDDLE_OFFSET } from '../../components/BackButton'

let mockFontScale = 1
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 400, height: 800, scale: 3, fontScale: mockFontScale }),
}))
afterEach(() => { mockFontScale = 1 })

const flat = (n: any) => StyleSheet.flatten(n.props.style)

describe('BackButton', () => {
  test('a drawn arrow and "Back", centred on each other in one row, in the screen’s colour and size', () => {
    const onPress = jest.fn()
    const { getByTestId, getByText } = render(
      <BackButton testID="back" onPress={onPress} style={{ color: '#aaa', fontSize: 15 }} />)
    const row = getByTestId('back')
    expect(flat(row)).toMatchObject({ flexDirection: 'row', alignItems: 'center' })
    expect(flat(getByText('Back'))).toMatchObject({ color: '#aaa', fontSize: 15 })
    const arrow = getByTestId('back-arrow')
    expect(arrow.props.width).toBeCloseTo(15 * ARROW.width)
    expect(arrow.props.height).toBeCloseTo(15 * ARROW.height)
    fireEvent.press(row)
    expect(onPress).toHaveBeenCalled()
  })

  test('the arrow is moved by the measured cap-middle offset (Jest runs as iOS)', () => {
    const { getByTestId } = render(<BackButton onPress={jest.fn()} style={{ color: '#fff', fontSize: 20 }} />)
    expect(flat(getByTestId('back-arrow')).transform).toEqual([{ translateY: 20 * CAP_MIDDLE_OFFSET.other }])
    expect(CAP_MIDDLE_OFFSET).toEqual({ android: 0.037, other: -0.014 })
  })

  test('the arrow grows with the system font size, up to the same 1.3x cap as the text', () => {
    mockFontScale = 1.2
    const a = render(<BackButton onPress={jest.fn()} style={{ color: '#fff', fontSize: 20 }} />)
    expect(a.getByTestId('back-arrow').props.width).toBeCloseTo(20 * 1.2 * ARROW.width)
    mockFontScale = 2
    const b = render(<BackButton onPress={jest.fn()} style={{ color: '#fff', fontSize: 20 }} />)
    expect(b.getByTestId('back-arrow').props.width).toBeCloseTo(20 * 1.3 * ARROW.width)
  })
})

// A "←" glyph sits at its font's own height (near the middle of lowercase letters), so it never lines up with "Back".
test('no screen draws a back arrow with the ← character', () => {
  const root = path.join(__dirname, '../..')
  const files: string[] = []
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (p.endsWith('.tsx')) files.push(p)
    }
  }
  ;['app', 'features', 'components'].forEach(d => walk(path.join(root, d)))
  const offenders = files.filter(f => fs.readFileSync(f, 'utf8').includes('←')).map(f => path.relative(root, f))
  expect(offenders).toEqual([])
})
