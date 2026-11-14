export type SizeClass = 'compact' | 'regular' | 'large'
export type Orientation = 'portrait' | 'landscape'

/** Shorter side below this (dp) is compact: Fold cover screens, small phones. */
export const COMPACT_MAX = 360
/** Shorter side at or above this (dp) is large: Fold inner screens, tablets. Matches Android 16's large-screen threshold. */
export const LARGE_MIN = 600

/** Classifies a window by its shorter side, so rotating never changes the size class. */
export function getScreenClass(width: number, height: number): { sizeClass: SizeClass; orientation: Orientation } {
  const shortSide = Math.min(width, height)
  const sizeClass: SizeClass = shortSide < COMPACT_MAX ? 'compact' : shortSide < LARGE_MIN ? 'regular' : 'large'
  return { sizeClass, orientation: width > height ? 'landscape' : 'portrait' }
}
