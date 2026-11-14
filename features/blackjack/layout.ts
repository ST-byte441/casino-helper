import { Orientation, SizeClass } from '../../lib/screenClass'

export type TableLayout = 'phone' | 'largePortrait' | 'largeLandscape'

/** Phones keep the original stack in any orientation; large screens pick by orientation. */
export function pickLayout(sizeClass: SizeClass, orientation: Orientation): TableLayout {
  if (sizeClass !== 'large') return 'phone'
  return orientation === 'landscape' ? 'largeLandscape' : 'largePortrait'
}
