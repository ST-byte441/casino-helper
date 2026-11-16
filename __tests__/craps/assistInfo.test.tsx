import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { AssistInfo } from '../../features/craps/components/AssistInfo'

describe('AssistInfo', () => {
  test('explains the bet quality colours and paying exactly', () => {
    const { getByText, getByTestId } = render(<AssistInfo visible view="table" onClose={jest.fn()} />)
    expect(getByText('What Assist shows')).toBeTruthy()
    for (const w of ['Best', 'Fine', 'Poor', 'Avoid']) expect(getByText(w)).toBeTruthy()
    expect(getByTestId('assist-info')).toHaveTextContent(/\$15 on the 6 wins \$17/)
    expect(getByTestId('assist-info')).toHaveTextContent(/Place 6 and 8 in \$6s/)
  })

  test('the table version explains the rings and the stack menu', () => {
    const { getByTestId } = render(<AssistInfo visible view="table" onClose={jest.fn()} />)
    expect(getByTestId('assist-info')).toHaveTextContent(/Green ring/)
    expect(getByTestId('assist-info')).toHaveTextContent(/Amber ring/)
    expect(getByTestId('assist-info')).toHaveTextContent(/Make it/)
    expect(getByTestId('assist-info')).not.toHaveTextContent(/green left edge/)
  })

  test('the list version explains its row edges instead', () => {
    const { getByTestId } = render(<AssistInfo visible view="list" onClose={jest.fn()} />)
    expect(getByTestId('assist-info')).toHaveTextContent(/green left edge/)
    expect(getByTestId('assist-info')).not.toHaveTextContent(/Green ring/)
  })

  test('Got it and the backdrop close it', () => {
    const onClose = jest.fn()
    const { getByTestId } = render(<AssistInfo visible view="list" onClose={onClose} />)
    fireEvent.press(getByTestId('assist-info-close'))
    fireEvent.press(getByTestId('assist-info-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  test('the card doesn’t take touches, so its text scrolls (a pressable card stole the scroll in landscape)', () => {
    const { getByTestId } = render(<AssistInfo visible view="table" onClose={jest.fn()} />)
    const card = getByTestId('assist-info')
    expect(card.props.onStartShouldSetResponder).toBeUndefined()
    expect(card.props.onClick).toBeUndefined()
  })
})
