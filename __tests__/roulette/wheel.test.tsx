jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
import React from 'react'
import { render } from '@testing-library/react-native'
import { SPIN_MS, pocketAngle, finalWheelRotation } from '../../features/roulette/wheelMath'
import { Wheel } from '../../features/roulette/components/Wheel'
import { wheelSequence, pocketLabel } from '../../features/roulette/engine'

describe('wheelMath', () => {
  test('SPIN_MS', () => {
    expect(SPIN_MS).toEqual({ slow: 7000, fast: 1500 })
  })

  test('pocketAngle of the first pocket is half a pocket', () => {
    expect(pocketAngle('double', 0)).toBeCloseTo(360 / 38 / 2)
  })

  test('pocketAngle of the second pocket', () => {
    expect(pocketAngle('double', 28)).toBeCloseTo(360 / 38 + 180 / 38)
  })

  test('pocketAngle handles the zero pockets of the triple wheel', () => {
    expect(pocketAngle('triple', -2)).toBeCloseTo(360 / 39 + 180 / 39)
    expect(pocketAngle('triple', -1)).toBeCloseTo((2 * 360) / 39 + 180 / 39)
  })

  test('finalWheelRotation brings the pocket to the top after the turns', () => {
    expect(finalWheelRotation('single', 0, 2)).toBeCloseTo(720 - 180 / 37)
  })

  test('the final rotation puts every pocket at the top (mod 360)', () => {
    for (const p of wheelSequence('triple')) {
      const top = (((finalWheelRotation('triple', p, 5) + pocketAngle('triple', p)) % 360) + 360) % 360
      expect(top).toBeCloseTo(0)
    }
  })
})

describe('Wheel', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  test('renders all 38 pocket labels for the double wheel', () => {
    const { getByTestId, getAllByTestId } = render(
      <Wheel wheel="double" result={17} speed="slow" onDone={jest.fn()} size={300} />,
    )
    expect(getAllByTestId(/^pocket-/)).toHaveLength(38)
    for (const p of wheelSequence('double')) expect(getByTestId(`pocket-${pocketLabel(p)}`)).toBeTruthy()
  })

  test('renders 39 pocket labels for the triple wheel, including 000', () => {
    const { getByTestId, getAllByTestId } = render(
      <Wheel wheel="triple" result={-2} speed="fast" onDone={jest.fn()} size={300} />,
    )
    expect(getAllByTestId(/^pocket-/)).toHaveLength(39)
    expect(getByTestId('pocket-000')).toBeTruthy()
  })

  test('renders a ball and a top pointer', () => {
    const { getByTestId } = render(<Wheel wheel="single" result={5} speed="slow" onDone={jest.fn()} size={300} />)
    expect(getByTestId('wheel-ball')).toBeTruthy()
    expect(getByTestId('wheel-pointer')).toBeTruthy()
  })

  test('slow: onDone is not called at 6999 ms and is called once at 7000 ms', () => {
    const onDone = jest.fn()
    render(<Wheel wheel="double" result={0} speed="slow" onDone={onDone} size={300} />)
    jest.advanceTimersByTime(6999)
    expect(onDone).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(onDone).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(10000)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  test('fast: onDone is not called at 1499 ms and is called once at 1500 ms', () => {
    const onDone = jest.fn()
    render(<Wheel wheel="single" result={32} speed="fast" onDone={onDone} size={300} />)
    jest.advanceTimersByTime(1499)
    expect(onDone).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(onDone).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(10000)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  test('re-rendering with the same props mid-spin still gives exactly one onDone', () => {
    const onDone = jest.fn()
    const { rerender } = render(<Wheel wheel="double" result={-1} speed="slow" onDone={onDone} size={300} />)
    jest.advanceTimersByTime(3000)
    rerender(<Wheel wheel="double" result={-1} speed="slow" onDone={onDone} size={300} />)
    jest.advanceTimersByTime(2000)
    // a rotation: new size, same props
    rerender(<Wheel wheel="double" result={-1} speed="slow" onDone={onDone} size={500} />)
    jest.advanceTimersByTime(1999)
    expect(onDone).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(onDone).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(10000)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  test('a new onDone identity on re-render does not restart the timer and the latest one is called', () => {
    const first = jest.fn()
    const second = jest.fn()
    const { rerender } = render(<Wheel wheel="single" result={1} speed="fast" onDone={first} size={300} />)
    jest.advanceTimersByTime(1000)
    rerender(<Wheel wheel="single" result={1} speed="fast" onDone={second} size={300} />)
    jest.advanceTimersByTime(500)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  test('frozen: never calls onDone', () => {
    const onDone = jest.fn()
    render(<Wheel wheel="double" result={7} speed="slow" onDone={onDone} size={300} frozen />)
    jest.advanceTimersByTime(20000)
    expect(onDone).not.toHaveBeenCalled()
  })

  test('unmounting before the end cancels onDone', () => {
    const onDone = jest.fn()
    const { unmount } = render(<Wheel wheel="double" result={7} speed="fast" onDone={onDone} size={300} />)
    jest.advanceTimersByTime(500)
    unmount()
    jest.advanceTimersByTime(5000)
    expect(onDone).not.toHaveBeenCalled()
  })
})
