import fs from 'fs'
import path from 'path'
import React from 'react'
import { render } from '@testing-library/react-native'
import { Text, TextInput, MAX_FONT_SCALE } from '../../components/Text'

test('Text caps font scaling at 1.3x by default', () => {
  const screen = render(<Text>hi</Text>)
  expect(MAX_FONT_SCALE).toBe(1.3)
  expect(screen.getByText('hi').props.maxFontSizeMultiplier).toBe(1.3)
})

test('a caller can still override the cap', () => {
  const screen = render(<Text maxFontSizeMultiplier={2}>big</Text>)
  expect(screen.getByText('big').props.maxFontSizeMultiplier).toBe(2)
})

test('TextInput caps font scaling too', () => {
  const screen = render(<TextInput testID="in" />)
  expect(screen.getByTestId('in').props.maxFontSizeMultiplier).toBe(1.3)
})

// Importing Text/TextInput straight from react-native would bypass the cap.
test('no app file imports Text or TextInput directly from react-native', () => {
  const root = path.join(__dirname, '../..')
  const wrapper = path.join(root, 'components/Text.tsx')
  const files: string[] = []
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (p.endsWith('.tsx') && p !== wrapper) files.push(p)
    }
  }
  ;['app', 'features', 'components'].forEach(d => walk(path.join(root, d)))
  const offenders = files.filter(f => {
    const src = fs.readFileSync(f, 'utf8')
    return [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-native'/g)].some(m =>
      m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).some(n => n === 'Text' || n === 'TextInput'))
  }).map(f => path.relative(root, f))
  expect(offenders).toEqual([])
})
