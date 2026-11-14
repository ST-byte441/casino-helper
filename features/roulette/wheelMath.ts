import { Pocket, RouletteSpeed, RouletteWheel } from '../../lib/types'
import { wheelSequence } from './engine'

export const SPIN_MS: Record<RouletteSpeed, number> = { slow: 7000, fast: 1500 }

/** Degrees clockwise from the top to the centre of pocket `p`. */
export function pocketAngle(wheel: RouletteWheel, p: Pocket): number {
  const seq = wheelSequence(wheel)
  const n = seq.length
  const index = seq.indexOf(p)
  if (index < 0) throw new Error(`pocket ${p} is not on the ${wheel} wheel`)
  return (index * 360) / n + 180 / n
}

/** Rotation (degrees, clockwise) that brings pocket `p` to the top after `turns` full turns. */
export function finalWheelRotation(wheel: RouletteWheel, p: Pocket, turns: number): number {
  return turns * 360 - pocketAngle(wheel, p)
}
