import React from 'react'
import { Text } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { InfoSheet } from '../../components/InfoSheet'

const TABS = [
  { key: 'how', label: 'How to play', title: 'How to play', content: <Text>rules body</Text> },
  { key: 'assist', label: 'What Assist shows', title: 'What Assist shows', content: <Text>assist body</Text> },
]

describe('InfoSheet tabs', () => {
  test('opens on the initial tab and switches between them', () => {
    const { getByTestId, queryByText, getByText } = render(
      <InfoSheet visible testID="s" tabs={TABS} initialTab="assist" onClose={jest.fn()} />)
    expect(getByText('assist body')).toBeTruthy()
    expect(queryByText('rules body')).toBeNull()
    expect(getByTestId('s-tab-assist').props.accessibilityState).toMatchObject({ selected: true })
    fireEvent.press(getByTestId('s-tab-how'))
    expect(getByText('rules body')).toBeTruthy()
    expect(queryByText('assist body')).toBeNull()
  })

  test('reopening goes back to the initial tab', () => {
    const r = render(<InfoSheet visible testID="s" tabs={TABS} initialTab="assist" onClose={jest.fn()} />)
    fireEvent.press(r.getByTestId('s-tab-how'))
    r.rerender(<InfoSheet visible={false} testID="s" tabs={TABS} initialTab="assist" onClose={jest.fn()} />)
    r.rerender(<InfoSheet visible testID="s" tabs={TABS} initialTab="assist" onClose={jest.fn()} />)
    expect(r.getByText('assist body')).toBeTruthy()
  })

  test('without tabs it shows the title and children as before', () => {
    const { getByText, queryByTestId } = render(
      <InfoSheet visible testID="s" title="Plain" onClose={jest.fn()}><Text>only</Text></InfoSheet>)
    expect(getByText('Plain')).toBeTruthy()
    expect(getByText('only')).toBeTruthy()
    expect(queryByTestId('s-tab-how')).toBeNull()
  })
})
