/** Chip constants and pure helpers shared by every game with a chip table. */

export type Point = { x: number; y: number }

/** What a drag or tap starts from: a chip in the tray, or a stack already on the table. */
export type ChipSource = { type: 'tray'; amount: number } | { type: 'stack'; id: string }

export const CHIP_COLORS: Record<number, { bg: string; fg: string }> = {
  1: { bg: '#fff', fg: '#000' },
  5: { bg: '#c62828', fg: '#fff' },
  25: { bg: '#2e7d32', fg: '#fff' },
  100: { bg: '#111', fg: '#fff' },
}

/** Chip denominations with a colour, smallest first. */
const CHIP_VALUES = Object.keys(CHIP_COLORS).map(Number).sort((a, b) => a - b)

/** A stack is drawn in the colour of the largest chip its total covers. */
export function stackChip(total: number): number {
  return [...CHIP_VALUES].reverse().find(c => c <= total) ?? CHIP_VALUES[0]
}

export const CHIP_SIZE = 44
/** How long a tap-placed bet's spot stays lit. */
export const TAP_FLASH_MS = 400
/** A deliberate press still counts as a tap; the 500ms default silently dropped slow taps. */
export const TAP_MAX_MS = 1500

/**
 * The finger's window position, from the dragged handle's measureInWindow origin plus the handle-relative
 * touch point (`e.x`/`e.y`, valid even outside the handle). Deliberately not `absoluteX/Y`: those use a
 * different vertical frame from measureInWindow on Android edge-to-edge (status bar), which drew the chip
 * below the finger and dropped it there.
 */
export function fingerInWindow(handleOrigin: Point, rel: Point): Point {
  'worklet'
  return { x: handleOrigin.x + rel.x, y: handleOrigin.y + rel.y }
}

/**
 * How far the visible fingertip edge reaches above the reported touch point (the touch point is the centre of
 * the finger's contact patch, well below the tip). Estimated from device testing on a Galaxy S23 Ultra: a chip
 * whose top was 33px above the touch point was fully covered; one whose bottom was 34px above it was fully visible.
 */
export const FINGERTIP_REACH = 34
/** Share of the dragged chip that shows above the fingertip edge; the rest tucks under the fingertip. */
const LIFT_SHARE = 0.75
/** How far the centre of a dragged chip of `chipSize` sits above the touch point. */
export function dragLift(chipSize: number): number {
  return FINGERTIP_REACH + chipSize * LIFT_SHARE - chipSize / 2
}
/** How far the dragged chip's centre sits above the touch point (at CHIP_SIZE). */
export const DRAG_LIFT = dragLift(CHIP_SIZE)

/**
 * The point a drag acts on: the finger lifted by `lift` (DRAG_LIFT, or dragLift of a scaled chip). The ghost chip is drawn here, and the highlight and
 * the drop use it too, so a chip lands exactly where it is shown.
 */
export function dragPoint(finger: Point, lift: number = DRAG_LIFT): Point {
  'worklet'
  return { x: finger.x, y: finger.y - lift }
}
