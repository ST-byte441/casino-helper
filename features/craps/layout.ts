import { ActiveBet, CrapsVariant } from '../../lib/types'
import { isValidBetForVariant } from './engine'
import { CHIP_SIZE } from '../../components/chips/chips'
import type { TableSize } from '../../lib/tableSize'

/*
 * Pure geometry for the drawn craps felt (one end of a Vegas table, the right-hand end). No React.
 *
 * Columns, left to right:
 *   [left end: DON'T COME over BIG 6 / BIG 8]  [middle bands]  [props box]  [dice column]
 * The left end exists only when Big 6/8 do (craps, crapless). Without Don't Come (crapless) the number row
 * runs over the left end. Without a left end (easy) the middle bands start at x = 0.
 *
 * Rows of the middle, top to bottom: number boxes, COME, FIELD, DON'T PASS, then PASS LINE across the full
 * width (under the props box and dice too). Bands a variant lacks give their height to the Field.
 * The props box and the dice column run from the top down to the Pass Line.
 *
 * Odds areas ("behind the line") are smaller strips inside their line band, so `hitCraps` (smallest area wins)
 * resolves them; the line's own centre stays outside its odds strip.
 *
 * Off puck: in the Don't Come box. Without Don't Come (crapless, easy) it sits in a strip at the top of the
 * dice column, above `diceRect`.
 */

export type Rect = { x: number; y: number; w: number; h: number }
export type Pt = { x: number; y: number }

export type SpotKey =
  | 'pass' | 'pass-odds' | 'dont-pass' | 'dont-pass-odds' | 'come' | 'dont-come'
  | 'field' | 'low-field' | 'high-field' | 'big6' | 'big8'
  | `box:${number}`
  | 'any-7' | `hard:${4 | 6 | 8 | 10}` | 'craps-2' | 'craps-3' | 'yo-11' | 'craps-12' | 'any-craps' | 'ce' | 'horn'

export type Area = { key: SpotKey; label: string; rect: Rect; tone: 'line' | 'field' | 'box' | 'prop' | 'odds' }

export type BoxSlots = { place: Pt; come: Pt; dontCome: Pt; lay: Pt; puck: Pt }

export type CrapsLayout = {
  width: number
  height: number
  areas: Area[]
  diceRect: Rect
  boxSlots: Record<number, BoxSlots>
  offPuck: Pt
  anchors: Record<SpotKey, Pt>
}

// Widths as fractions of the felt width.
const LEFT_W = 0.1
// Wide enough for four Hardways in one row at >= 32dp each on the narrowest table felt.
const PROPS_W = 0.2
const DICE_W = 0.11
// Band heights as weights of the felt height. Missing bands go to the Field.
const BAND = { boxes: 24, come: 19, field: 19, dontPass: 14, pass: 24 }
// Behind-the-line strips.
const PASS_ODDS_X0 = 0.55
const PASS_ODDS_X1 = 0.75
const PASS_ODDS_TOP = 0.45 // fraction of the Pass band where its odds strip starts
const DP_ODDS_W = 0.14
const ODDS_PAD = 2
// Off-puck strip at the top of the dice column, as a fraction of the column height (capped).
const PUCK_STRIP = 0.2
const PUCK_STRIP_MAX = 48

const STD_NUMBERS = [4, 5, 6, 8, 9, 10]
const WIDE_NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]
const BOX_LABEL: Record<number, string> = { 6: 'SIX', 9: 'NINE' }

const centre = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
const contains = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h

/** The table view's chrome around the felt: slim header, chip tray column at the left, frame margin. */
export const TABLE_HEADER_H = 28
export const TABLE_TRAY_W = 60
export const TABLE_MARGIN = 4

/** Chips on large screens are this much bigger (fixed, so a tablet never gets giant chips): 44 → 55dp. */
export const LARGE_CHIP_SCALE = 1.25

export type TableChrome = {
  headerH: number
  /** The tray column's width (landscape), sized for `chip`. */
  trayW: number
  margin: number
  chip: number
  /** Large portrait only: the reason line and the tray row under the felt. */
  reasonH: number
  trayRowH: number
}

/** Regular is the phone-landscape chrome; large scales the chips (and the tray and header with them). */
export const TABLE_CHROME: Record<TableSize, TableChrome> = {
  regular: { headerH: TABLE_HEADER_H, trayW: TABLE_TRAY_W, margin: TABLE_MARGIN, chip: CHIP_SIZE,
    reasonH: 28, trayRowH: CHIP_SIZE + 21 },
  large: { headerH: 36, trayW: Math.round(TABLE_TRAY_W * LARGE_CHIP_SCALE), margin: TABLE_MARGIN,
    chip: Math.round(CHIP_SIZE * LARGE_CHIP_SCALE), reasonH: 32, trayRowH: Math.round(CHIP_SIZE * LARGE_CHIP_SCALE) + 21 },
}

/** Large portrait: the felt keeps a landscape shape at the full width (height = width × this). */
export const PORTRAIT_FELT_RATIO = 0.625

/** Large portrait puts the tray and reason line under a full-width felt; every other table view uses the column. */
export function isTablePortrait(size: TableSize, w: number, h: number): boolean {
  return size === 'large' && h > w
}

/** The felt size the table view gives a screen of w×h (before safe-area insets). */
export function tableFeltSize(w: number, h: number, size: TableSize = 'regular'): { width: number; height: number } {
  const c = TABLE_CHROME[size]
  if (isTablePortrait(size, w, h)) {
    const width = w - 2 * c.margin
    const room = h - c.headerH - c.reasonH - c.trayRowH - 2 * c.margin
    return { width, height: Math.min(width * PORTRAIT_FELT_RATIO, room) }
  }
  return { width: w - c.trayW - 2 * c.margin, height: h - c.headerH - 2 * c.margin }
}

export function boxNumbers(variant: CrapsVariant): number[] {
  return variant === 'craps' ? STD_NUMBERS : WIDE_NUMBERS
}

export function buildCrapsLayout(variant: CrapsVariant, width: number, height: number): CrapsLayout {
  const hasDP = isValidBetForVariant('dont-pass', variant)
  const hasDC = isValidBetForVariant('dont-come', variant)
  const hasCome = isValidBetForVariant('come', variant)
  const hasBig = isValidBetForVariant('big6', variant)
  const easyField = isValidBetForVariant('low-field', variant)

  const areas: Area[] = []
  const add = (key: SpotKey, label: string, rect: Rect, tone: Area['tone']) => areas.push({ key, label, rect, tone })

  // Vertical bands.
  const w = { ...BAND }
  if (!hasCome) { w.field += w.come; w.come = 0 }
  if (!hasDP) { w.field += w.dontPass; w.dontPass = 0 }
  const unit = height / (w.boxes + w.come + w.field + w.dontPass + w.pass)
  const boxesH = w.boxes * unit, comeH = w.come * unit, fieldH = w.field * unit, dpH = w.dontPass * unit
  const passH = w.pass * unit
  const comeY = boxesH, fieldY = comeY + comeH, dpY = fieldY + fieldH, passY = dpY + dpH

  // Columns.
  const leftW = hasBig ? width * LEFT_W : 0
  const diceW = width * DICE_W
  const propsW = width * PROPS_W
  const propsX = width - diceW - propsW
  const diceX = propsX + propsW
  const midX = leftW
  const midW = propsX - midX

  // Left end.
  if (hasDC) add('dont-come', "DON'T COME", { x: 0, y: 0, w: leftW, h: boxesH }, 'line')
  if (hasBig) {
    const top = boxesH, half = (passY - top) / 2
    add('big6', 'BIG 6', { x: 0, y: top, w: leftW, h: half }, 'field')
    add('big8', 'BIG 8', { x: 0, y: top + half, w: leftW, h: half }, 'field')
  }

  // Number boxes (they run over the left end when there's no Don't Come box there).
  const nums = boxNumbers(variant)
  const rowX = hasDC ? midX : 0
  const boxW = (propsX - rowX) / nums.length
  const boxSlots: Record<number, BoxSlots> = {}
  nums.forEach((n, i) => {
    const r = { x: rowX + i * boxW, y: 0, w: boxW, h: boxesH }
    add(`box:${n}`, BOX_LABEL[n] ?? String(n), r, 'box')
    const at = (fx: number, fy: number): Pt => ({ x: r.x + fx * r.w, y: r.y + fy * r.h })
    boxSlots[n] = {
      dontCome: at(0.5, 0.14), // the box's upper strip
      come: at(0.25, 0.45),
      puck: at(0.5, 0.45),
      lay: at(0.75, 0.45),
      place: at(0.5, 0.78), // bottom centre
    }
  })

  // Middle bands.
  if (hasCome) add('come', 'COME', { x: midX, y: comeY, w: midW, h: comeH }, 'line')
  if (easyField) {
    const q = midW / 4
    add('low-field', 'LOW FIELD', { x: midX, y: fieldY, w: q, h: fieldH }, 'field')
    add('field', 'FIELD', { x: midX + q, y: fieldY, w: 2 * q, h: fieldH }, 'field')
    add('high-field', 'HIGH FIELD', { x: midX + 3 * q, y: fieldY, w: q, h: fieldH }, 'field')
  } else {
    add('field', 'FIELD', { x: midX, y: fieldY, w: midW, h: fieldH }, 'field')
  }
  if (hasDP) {
    add('dont-pass', "DON'T PASS BAR 12", { x: midX, y: dpY, w: midW, h: dpH }, 'line')
    const ow = width * DP_ODDS_W
    add('dont-pass-odds', 'LAY ODDS', { x: propsX - ow, y: dpY + ODDS_PAD, w: ow - ODDS_PAD, h: dpH - 2 * ODDS_PAD }, 'odds')
  }
  add('pass', 'PASS LINE', { x: 0, y: passY, w: width, h: passH }, 'line')
  const poY = passY + passH * PASS_ODDS_TOP
  add('pass-odds', 'ODDS', {
    x: width * PASS_ODDS_X0, y: poY, w: width * (PASS_ODDS_X1 - PASS_ODDS_X0), h: passY + passH - poY - ODDS_PAD,
  }, 'odds')

  // Props box: 5 rows (so each stays >= 32dp on the shortest felt), split into `cols` cells where paired.
  const rowH = passY / 5
  const cell = (row: number, col: number, cols: number): Rect =>
    ({ x: propsX + col * (propsW / cols), y: row * rowH, w: propsW / cols, h: rowH })
  add('any-7', 'SEVEN', cell(0, 0, 1), 'prop')
  add('hard:6', 'HARD 6', cell(1, 0, 4), 'prop')
  add('hard:10', 'HARD 10', cell(1, 1, 4), 'prop')
  add('hard:8', 'HARD 8', cell(1, 2, 4), 'prop')
  add('hard:4', 'HARD 4', cell(1, 3, 4), 'prop')
  add('craps-2', '2', cell(2, 0, 4), 'prop')
  add('craps-3', '3', cell(2, 1, 4), 'prop')
  add('craps-12', '12', cell(2, 2, 4), 'prop')
  add('yo-11', '11', cell(2, 3, 4), 'prop')
  add('any-craps', 'ANY CRAPS', cell(3, 0, 1), 'prop')
  add('ce', 'C&E', cell(4, 0, 2), 'prop')
  add('horn', 'HORN', cell(4, 1, 2), 'prop')

  // Dice column, and the off puck.
  let diceRect: Rect = { x: diceX, y: 0, w: diceW, h: passY }
  let offPuck: Pt
  const dc = areas.find(a => a.key === 'dont-come')
  if (dc) {
    offPuck = centre(dc.rect)
  } else {
    const strip = Math.min(passY * PUCK_STRIP, PUCK_STRIP_MAX)
    offPuck = { x: diceX + diceW / 2, y: strip / 2 }
    diceRect = { x: diceX, y: strip, w: diceW, h: passY - strip }
  }

  const anchors = {} as Record<SpotKey, Pt>
  for (const a of areas) anchors[a.key] = a.tone === 'box' ? boxSlots[Number(a.key.slice(4))].place : centre(a.rect)

  return { width, height, areas, diceRect, boxSlots, offPuck, anchors }
}

/** The smallest area containing the point, or null off every area. */
export function hitCraps(layout: CrapsLayout, x: number, y: number): SpotKey | null {
  let best: Area | null = null
  for (const a of layout.areas) {
    if (!contains(a.rect, x, y)) continue
    if (!best || a.rect.w * a.rect.h < best.rect.w * best.rect.h) best = a
  }
  return best?.key ?? null
}

const DIRECT: Partial<Record<ActiveBet['type'], SpotKey>> = {
  pass: 'pass', 'dont-pass': 'dont-pass', come: 'come', 'dont-come': 'dont-come',
  field: 'field', 'low-field': 'low-field', 'high-field': 'high-field', big6: 'big6', big8: 'big8',
  'any-7': 'any-7', 'any-craps': 'any-craps', 'craps-2': 'craps-2', 'craps-3': 'craps-3',
  'yo-11': 'yo-11', 'craps-12': 'craps-12', ce: 'ce', horn: 'horn',
}

/**
 * Where a bet's chip stack is drawn. Come / Don't Come bets that moved to a number go to that box's come /
 * dontCome slot; place and buy to the place slot; lay to the lay slot; the rest to their area's anchor.
 * Bets with no felt area (hi-lo, world, hops; or an area missing in this variant) fall back to the props box
 * centre.
 */
export function slotFor(layout: CrapsLayout, bet: ActiveBet): Pt {
  const n = bet.comePoint ?? bet.number
  if ((bet.type === 'come' || bet.type === 'dont-come') && bet.comePoint != null && layout.boxSlots[bet.comePoint]) {
    return bet.type === 'come' ? layout.boxSlots[bet.comePoint].come : layout.boxSlots[bet.comePoint].dontCome
  }
  if ((bet.type === 'place' || bet.type === 'buy') && n != null && layout.boxSlots[n]) return layout.boxSlots[n].place
  if (bet.type === 'lay' && n != null && layout.boxSlots[n]) return layout.boxSlots[n].lay
  const key: SpotKey | undefined = bet.type === 'hardway' ? (`hard:${bet.number}` as SpotKey) : DIRECT[bet.type]
  if (key && layout.anchors[key]) return layout.anchors[key]
  const top = layout.anchors['any-7'], bottom = layout.anchors['any-craps']
  return { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 }
}
