import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { OddsRow } from '../../features/craps/components/OddsRow'

describe('OddsRow', () => {
  test('an increment that would pass the cap is disabled; one that fits is not', () => {
    const onAdd = jest.fn()
    const { getByText } = render(
      <OddsRow odds={10} maxOdds={15} increments={[1, 5, 10]} onAdd={onAdd} onRemove={jest.fn()} />,
    )
    const disabled = (t: string) => {
      let n: any = getByText(t)
      while (n && !n.props.accessibilityState) n = n.parent
      return n?.props.accessibilityState?.disabled === true
    }
    expect(disabled('+$1')).toBe(false)
    expect(disabled('+$5')).toBe(false)
    expect(disabled('+$10')).toBe(true)
    fireEvent.press(getByText('+$10'))
    expect(onAdd).not.toHaveBeenCalled()
    fireEvent.press(getByText('+$5'))
    expect(onAdd).toHaveBeenCalledWith(5)
  })
})
