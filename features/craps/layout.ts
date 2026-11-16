import { ActiveBet, CrapsVariant } from '../../lib/types'
import { isValidBetForVariant } from './engine'
import { CHIP_SIZE } from '../../components/chips/chips'
import type { TableSize } from '../../lib/tableSize'

/*
 * Pure geometry for the drawn craps felt (one end of a Vegas table, the right-hand end). No React.
 *
 * Columns, left to right:
 *   [left end: DON'T COME over BIG 6 / BIG 8]  [middle bands]  [props box, to the right edge]
 * The left end exists only when Big 6/8 do (craps, crapless). Without Don't Come (crapless) the number row
 * runs over the left end. Without a left end (easy) the middle bands start at x = 0.
 *
 * Rows of the middle, top to bottom: number boxes, COME, FIELD, DON'T PASS, then the bottom band: PASS LINE from
 * the left edge to the dice block (`diceRect`: the dice and ROLL) at its right end. Bands a variant lacks give
 * their height to the Field. The props box runs from the top down to the bottom band.
 *
 * Odds areas ("behind the line") are smaller strips inside their line band, so `hitCraps` (smallest area wins)
 * resolves them; the line's own centre stays outside its odds strip. The line's label sits left of centre in its
 * own box (`labelRect`) and the odds strip to the right of it, so odds chips never cover the label.
 *
 * Number boxes (`packBox`): the puck top-right, Don't Come top-left, come / lay in the bottom corners, place at the
 * bottom centre (or as near as it fits), each odds stack beside its flat bet: no two overlap, and the number
 * (`labelRect`, `boxLabels`) takes the biggest font clear of them all. Stacks shrink (to 22dp at the least) when a
 * box is too small for them at full size.
 *
 * More bets strip: a thin band at the bottom of the props box (`moreRect`, not an area: it takes no chip) where the
 * More bets panel's World, Hi-Lo and Hop stacks are drawn, so they never sit on a props cell.
 *
 * Off puck: in the Don't Come box. Without Don't Come (crapless, easy) it sits at the Pass Line's right end, past
 * its odds.
 */

export type Rect = { x: number; y: number; w: number; h: number }
export type Pt = { x: number; y: number }

export type SpotKey =
  | 'pass' | 'pass-odds' | 'dont-pass' | 'dont-pass-odds' | 'come' | 'dont-come'
  | 'field' | 'low-field' | 'high-field' | 'big6' | 'big8'
  | `box:${number}`
  | 'any-7' | `hard:${4 | 6 | 8 | 10}` | 'craps-2' | 'craps-3' | 'yo-11' | 'craps-12' | 'any-craps' | 'ce' | 'horn'

export type Area = { key: SpotKey; label: string; rect: Rect; tone: 'line' | 'field' | 'box' | 'prop' | 'odds' }

export type BoxSlots = { place: Pt; come: Pt; dontCome: Pt; lay: Pt; puck: Pt; comeOdds: Pt; dontComeOdds: Pt }

/** A number box's label as the felt draws it: the text, its font size, and the box the text takes up. */
export type BoxLabel = { text: string; fontSize: number; box: Rect }

export type CrapsLayout = {
  width: number
  height: number
  /** The chip stacks' drawn size (see `stackSizeFor`). */
  stack: number
  areas: Area[]
  diceRect: Rect
  /** The More bets strip under the props cells (World, Hi-Lo, Hops). */
  moreRect: Rect
  boxSlots: Record<number, BoxSlots>
  /** Where an area's label is drawn when that isn't the whole area (see `labelRect`). */
  labels: Partial<Record<SpotKey, Rect>>
  /** Each number box's label text (by number). No chip slot or puck enters its `box`. */
  boxLabels: Record<number, BoxLabel>
  offPuck: Pt
  anchors: Record<SpotKey, Pt>
}

// Widths as fractions of the felt width.
const LEFT_W = 0.1
// Wide enough for four Hardways in one row at >= 32dp each on the narrowest table felt.
const PROPS_W = 0.2
// The dice block at the right end of the Pass Line band: wide enough for the dice beside a ROLL button.
const DICE_W = 0.28
// Band heights as weights of the felt height. Missing bands go to the Field.
const BAND = { boxes: 24, come: 19, field: 19, dontPass: 14, pass: 24 }
// Line bands, as fractions of the band's width: the label's box (left of centre), then the odds strip to its right.
// The flat bet sits at the band's centre, between the two. Pass stops short of its right end for the off puck.
const LINE_LABEL_X0 = 0.03
const LINE_LABEL_X1 = 0.44
const PASS_ODDS_X0 = 0.56
const PASS_ODDS_X1 = 0.84
const DP_ODDS_X0 = 0.58
const DP_ODDS_X1 = 0.94
const ODDS_PAD = 2
// Without Don't Come the off puck sits at this fraction of the Pass Line's width (past its odds).
const OFF_PUCK_X = 0.92
// More bets strip at the bottom of the props box, as a fraction of the props box height, clamped so it holds one
// row of stacks and the five props rows above it keep >= 32dp on the shortest felt.
const MORE_STRIP = 0.17
const MORE_STRIP_MIN = 34
const MORE_STRIP_MAX = 64

// Number boxes: how far the puck and the Don't Come slot sit in from the box's corner.
const SLOT_INSET = 2
// SIX / NINE are spelled out only while they still read at this size; else the digit.
const MIN_WORD_FONT = 15

const STD_NUMBERS = [4, 5, 6, 8, 9, 10]
const WIDE_NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]
const BOX_LABEL: Record<number, string> = { 6: 'SIX', 9: 'NINE' }

/** A font size that fits `chars` characters on one line in w×h (bold caps are about 0.62em wide). */
export const fit = (chars: number, w: number, h: number, share: number, max = 40) =>
  Math.max(7, Math.min(h * share, (w * 0.9) / (Math.max(chars, 1) * 0.62), max))

/** The text box of `text` at `fontSize`, centred in `r` (0.62em per char, 1.2em tall). */
const textBox = (text: string, fontSize: number, r: Rect): Rect => {
  const w = text.length * 0.62 * fontSize, h = fontSize * 1.2
  return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h }
}

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
  const labels: CrapsLayout['labels'] = {}
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
  const propsX = width - propsW
  const diceX = width - diceW
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
  const boxLabels: Record<number, BoxLabel> = {}
  // Every box packs the same way (see `packBox`): the slots this game can fill, the puck and the number, none
  // overlapping, with the chip stacks shrunk (never below MIN_STACK) when the box is too small at full size.
  const pack = packBoxes(boxW, boxesH, stackSize(height, boxW), hasDC, hasCome, isValidBetForVariant('lay', variant))
  const stack = pack.stack
  nums.forEach((n, i) => {
    const r = { x: rowX + i * boxW, y: 0, w: boxW, h: boxesH }
    add(`box:${n}`, BOX_LABEL[n] ?? String(n), r, 'box')
    const lb = { x: r.x + pack.label.x, y: r.y + pack.label.y, w: pack.label.w, h: pack.label.h }
    labels[`box:${n}`] = lb
    const text = (pack.words && BOX_LABEL[n]) || String(n)
    boxLabels[n] = { text, fontSize: pack.fontSize, box: textBox(text, pack.fontSize, lb) }
    const at = (p: Pt): Pt => ({ x: r.x + p.x, y: r.y + p.y })
    boxSlots[n] = {
      dontCome: at(pack.slots.dontCome), puck: at(pack.slots.puck), come: at(pack.slots.come), lay: at(pack.slots.lay),
      place: at(pack.slots.place), comeOdds: at(pack.slots.comeOdds), dontComeOdds: at(pack.slots.dontComeOdds),
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
  // A line band: its label's box left of centre, its odds strip (fractions x0..x1 of the band) right of the label.
  const line = (key: SpotKey, label: string, r: Rect, odds: SpotKey, oddsLabel: string, x0: number, x1: number) => {
    add(key, label, r, 'line')
    const at = (f: number) => r.x + f * r.w
    labels[key] = { x: at(LINE_LABEL_X0), y: r.y + ODDS_PAD, w: at(LINE_LABEL_X1) - at(LINE_LABEL_X0), h: r.h - 2 * ODDS_PAD }
    add(odds, oddsLabel, { x: at(x0), y: r.y + ODDS_PAD, w: at(x1) - at(x0), h: r.h - 2 * ODDS_PAD }, 'odds')
  }
  if (hasDP) {
    line('dont-pass', "DON'T PASS BAR 12", { x: midX, y: dpY, w: midW, h: dpH }, 'dont-pass-odds', 'LAY ODDS',
      DP_ODDS_X0, DP_ODDS_X1)
  }
  const passW = diceX
  line('pass', 'PASS LINE', { x: 0, y: passY, w: passW, h: passH }, 'pass-odds', 'ODDS', PASS_ODDS_X0, PASS_ODDS_X1)

  // Props box: 5 rows (so each stays >= 32dp on the shortest felt), split into `cols` cells where paired, over the
  // More bets strip.
  const moreH = Math.min(Math.max(passY * MORE_STRIP, MORE_STRIP_MIN), MORE_STRIP_MAX)
  const moreRect: Rect = { x: propsX, y: passY - moreH, w: propsW, h: moreH }
  const rowH = (passY - moreH) / 5
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

  // Dice block at the Pass Line's right end, and the off puck.
  const diceRect: Rect = { x: diceX, y: passY, w: diceW, h: passH }
  const dc = areas.find(a => a.key === 'dont-come')
  const offPuck: Pt = dc ? centre(dc.rect) : { x: passW * OFF_PUCK_X, y: passY + passH / 2 }

  const anchors = {} as Record<SpotKey, Pt>
  for (const a of areas) anchors[a.key] = a.tone === 'box' ? boxSlots[Number(a.key.slice(4))].place : centre(a.rect)

  return { width, height, stack, areas, diceRect, moreRect, boxSlots, labels, boxLabels, offPuck, anchors }
}

/** The box an area's label is drawn in: its own label box where it has one, else the whole area. */
export function labelRect(layout: CrapsLayout, key: SpotKey): Rect {
  const own = layout.labels[key]
  if (own) return own
  const a = layout.areas.find(x => x.key === key)
  if (!a) throw new Error(`no area ${key}`)
  return a.rect
}

// Chip stacks: roulette's 28dp at the 320dp minimum felt height, growing with the felt but capped for tablets, and
// never wider than ~44% of a number box so its come / place / lay slots stay readable. The puck is a touch smaller.
const BASE_STACK = 28
const MAX_STACK_SCALE = 1.4
const PUCK_SHARE = 0.95

function stackSize(height: number, boxW: number): number {
  const scale = Math.min(Math.max(height / 320, 1), MAX_STACK_SCALE)
  return Math.round(Math.max(20, Math.min(BASE_STACK * scale, boxW * 0.44)))
}

/** The drawn size of a bet's chip stack on this felt (shrunk in boxes too small for full-size stacks). */
export function stackSizeFor(layout: CrapsLayout): number {
  return layout.stack
}

/** The drawn size (diameter) of the ON / OFF puck. */
export function puckSizeFor(layout: CrapsLayout): number {
  return Math.round(stackSizeFor(layout) * PUCK_SHARE)
}

// Shrunk stacks stay at least this big so their amounts still read.
const MIN_STACK = 22
// The odds stack is this share of the flat bet's (the felt draws it so).
export const ODDS_SHARE = 0.7

/** The drawn size of an odds stack beside a flat bet of size `stack`. */
export function oddsSizeFor(stack: number): number {
  return Math.max(MIN_ODDS_STACK, Math.round(stack * ODDS_SHARE))
}
// At most this gap between an odds chip and its flat bet's chip.
const ODDS_GAP = 16
// Odds chips never smaller than this, so their amount reads.
const MIN_ODDS_STACK = 20
// A roomy box keeps its number at least this share of its band font (`bandFont`), shrinking stacks if need be.
const NUMBER_VS_BAND = 0.75
// SIX / NINE are spelled out only when that keeps at least this share of the digits' font.
const WORD_VS_DIGITS = 0.75
// The box number is wanted at least this big before the stacks stop shrinking.
const MIN_NUMBER_FONT = 16

type BoxPack = {
  stack: number
  slots: Omit<BoxSlots, never>
  /** The number's box (box-relative): the widest label at `fontSize`. */
  label: Rect
  fontSize: number
  words: boolean
}

/**
 * One box's slots at stack size s, box-relative. The flat-bet slots go first, each taking the free point nearest
 * its spot (puck top-right, Don't Come top-left, come bottom-left, lay bottom-right, place bottom-centre). Each odds
 * stack then goes against its flat bet (`oddsBy`). Last, the number takes the biggest font whose text box fits
 * clear of them all. Slots a game can't fill sit on the place slot (never drawn). Null if a slot finds no room.
 */
function packBox(w: number, h: number, s: number, hasDC: boolean, hasCome: boolean, hasLay: boolean): BoxPack | null {
  const I = SLOT_INSET
  const puckR = Math.round(s * PUCK_SHARE) / 2
  const r = s / 2
  const oddsR = oddsSizeFor(s) / 2
  // Plain number arrays and comparisons: this runs on every layout build, so the 1dp grid scans stay cheap.
  const px: number[] = [], py: number[] = [], pr: number[] = []
  const free = (x: number, y: number, rad: number) => {
    for (let k = 0; k < px.length; k++) {
      const dx = x - px[k], dy = y - py[k], rr = rad + pr[k]
      if (dx * dx + dy * dy < rr * rr) return false
    }
    return true
  }
  // The free grid point nearest the wanted spot (the spot itself when free, else a full 1dp scan).
  const put = (want: Pt, rad: number, near?: { at: Pt; within: number }): Pt | null => {
    const nearOk = (x: number, y: number) =>
      !near || (x - near.at.x) * (x - near.at.x) + (y - near.at.y) * (y - near.at.y) <= near.within * near.within
    const inside = want.x >= rad + I - 1e-9 && want.x <= w - rad - I + 1e-9 && want.y >= rad + I - 1e-9 && want.y <= h - rad - I + 1e-9
    if (inside && nearOk(want.x, want.y) && free(want.x, want.y, rad)) { px.push(want.x); py.push(want.y); pr.push(rad); return want }
    let bx = 0, by = 0, bestD = Infinity
    for (let x = rad + I; x <= w - rad - I + 1e-9; x += 1)
      for (let y = rad + I; y <= h - rad - I + 1e-9; y += 1) {
        const d = (x - want.x) * (x - want.x) + (y - want.y) * (y - want.y)
        if (d < bestD && nearOk(x, y) && free(x, y, rad)) { bx = x; by = y; bestD = d }
      }
    if (bestD === Infinity) return null
    px.push(bx); py.push(by); pr.push(rad)
    return { x: bx, y: by }
  }
  // An odds stack stays against its flat bet (at most ODDS_GAP between the chips), so it reads as that bet's.
  const beside = (at: Pt) => ({ at, within: r + oddsR + ODDS_GAP })

  // The extreme corners exactly, so the corner slots sit flush whatever the grid.
  const corner = (rad: number, right: boolean, bottom: boolean): Pt =>
    ({ x: right ? w - rad - I : rad + I, y: bottom ? h - rad - I : rad + I })
  const puck = put(corner(puckR, true, false), puckR)
  const dontCome = hasDC ? put(corner(r, false, false), r) : null
  const come = hasCome ? put(corner(r, false, true), r) : null
  const lay = hasLay ? put(corner(r, true, true), r) : null
  const place = put({ x: w / 2, y: h - r - I }, r)
  if (!puck || !place || (hasDC && !dontCome) || (hasCome && !come) || (hasLay && !lay)) return null
  // Odds stacks against their flat bet: the first free of a few set directions (beside it in its row, then
  // toward the box's middle), else the nearest free point within ODDS_GAP of it.
  const oddsBy = (at: Pt, dirs: number[]): Pt | null => {
    const d = r + oddsR + 0.5
    for (const deg of dirs) {
      const a = (deg * Math.PI) / 180
      const want = { x: at.x + d * Math.cos(a), y: at.y + d * Math.sin(a) }
      const inside = want.x >= oddsR + I - 1e-9 && want.x <= w - oddsR - I + 1e-9 && want.y >= oddsR + I - 1e-9 && want.y <= h - oddsR - I + 1e-9
      if (inside && free(want.x, want.y, oddsR)) { px.push(want.x); py.push(want.y); pr.push(oddsR); return want }
    }
    return put({ x: at.x + d * Math.cos((dirs[0] * Math.PI) / 180), y: at.y + d * Math.sin((dirs[0] * Math.PI) / 180) }, oddsR, beside(at))
  }
  // Angles in degrees, y down: come sits bottom-left (right, then up); Don't Come top-left (right, then down).
  const comeOdds = come ? oddsBy(come, [0, -90, -45, -135, 45]) : null
  const dontComeOdds = dontCome ? oddsBy(dontCome, [0, 90, 45, 135, -45]) : null
  if ((come && !comeOdds) || (dontCome && !dontComeOdds)) return null
  const flat = px.length

  // A text box clear of the flat-bet slots, nearest the centre (square rings outward: close enough).
  const textAt = (cw: number, ch: number): Rect | null => {
    const clear = (x: number, y: number) => {
      for (let k = 0; k < flat; k++) {
        const cx = px[k], cy = py[k]
        const dx = cx < x ? x - cx : cx > x + cw ? cx - x - cw : 0
        const dy = cy < y ? y - cy : cy > y + ch ? cy - y - ch : 0
        if (dx * dx + dy * dy < pr[k] * pr[k]) return false
      }
      return true
    }
    const x0 = Math.round((w - cw) / 2), y0 = Math.round((h - ch) / 2)
    const ok = (x: number, y: number) => x >= I && y >= I && x + cw <= w - I + 1e-9 && y + ch <= h - I + 1e-9 && clear(x, y)
    const rings = Math.ceil(Math.max(x0 - I, w - I - cw - x0, y0 - I, h - I - ch - y0, 0))
    for (let k = 0; k <= rings; k++) {
      for (let d = -k; d <= k; d++) {
        if (ok(x0 + d, y0 - k)) return { x: x0 + d, y: y0 - k, w: cw, h: ch }
        if (ok(x0 + d, y0 + k)) return { x: x0 + d, y: y0 + k, w: cw, h: ch }
        if (ok(x0 - k, y0 + d)) return { x: x0 - k, y: y0 + d, w: cw, h: ch }
        if (ok(x0 + k, y0 + d)) return { x: x0 + k, y: y0 + d, w: cw, h: ch }
      }
    }
    return null
  }
  type Fit = { f: number; at: Rect }
  const tryFont = (chars: number, f: number): Fit | null => {
    const at = textAt(chars * 0.62 * f, 1.2 * f)
    return at ? { f, at } : null
  }
  // Down from the biggest font in half points, first fit wins. (Not a binary search: the text box and the odds
  // move as the font changes, so room isn't monotonic in the font.)
  const fitText = (chars: number): Fit | null => {
    for (let k = Math.floor(2 * Math.min(40, (w - 2 * I) / (chars * 0.62), (h - 2 * I) / 1.2)); k >= 14; k--) {
      const got = tryFont(chars, k / 2)
      if (got) return got
    }
    return null
  }
  // SIX / NINE when NINE (the longer word) reads at MIN_WORD_FONT and costs little against the digits
  // ("10" the widest); else digits.
  const digits = fitText(2)
  const word = fitText('NINE'.length)
  const words = !!word && word.f >= MIN_WORD_FONT && (!digits || word.f >= WORD_VS_DIGITS * digits.f)
  const label = words ? word : digits
  if (!label) return null
  return {
    stack: s,
    slots: {
      puck, place, dontCome: dontCome ?? place, come: come ?? place, lay: lay ?? place,
      comeOdds: comeOdds ?? place, dontComeOdds: dontComeOdds ?? place,
    },
    label: label.at, fontSize: label.f, words,
  }
}

/**
 * The font the number ("10") would get between a top row (puck) and one bottom row of stacks of size s: what a
 * roomy box affords. 0 when the box is too short for such a band.
 */
function bandFont(w: number, h: number, s: number): number {
  const bh = h - (Math.max(s, Math.round(s * PUCK_SHARE)) + 2 * SLOT_INSET) - (s + 2 * SLOT_INSET)
  return bh > 0 ? fit(2, w - 2 * SLOT_INSET, bh, 0.8) : 0
}

/**
 * The biggest stack (from `base` down to MIN_STACK) whose box packs with the number at MIN_NUMBER_FONT or more and
 * at least NUMBER_VS_BAND of its band font, so roomy boxes trade a little stack size for a big number. Failing
 * that, the pack with the biggest number for its band; failing any pack, a plain fallback (never throws).
 */
function packBoxes(w: number, h: number, base: number, hasDC: boolean, hasCome: boolean, hasLay: boolean): BoxPack {
  let best: { p: BoxPack; score: number } | null = null
  for (let s = base; s >= Math.min(base, MIN_STACK); s--) {
    const p = packBox(w, h, s, hasDC, hasCome, hasLay)
    if (!p) continue
    const want = Math.max(MIN_NUMBER_FONT, NUMBER_VS_BAND * bandFont(w, h, s))
    if (p.fontSize >= want) return p
    const score = p.fontSize / want
    if (!best || score > best.score) best = { p, score }
  }
  if (best) return best.p
  return fallbackBox(w, h, Math.min(base, MIN_STACK))
}

/** A felt too small for any clean pack: corner slots clamped into the box, the number centred over them. */
function fallbackBox(w: number, h: number, s: number): BoxPack {
  const I = SLOT_INSET
  const r = Math.min(s / 2, (w - 2 * I) / 2, (h - 2 * I) / 2)
  const at = (fx: number, fy: number): Pt => ({ x: r + I + fx * Math.max(0, w - 2 * (r + I)), y: r + I + fy * Math.max(0, h - 2 * (r + I)) })
  const place = at(0.5, 1)
  const fontSize = fit(2, w - 2 * I, h - 2 * I, 0.5)
  const tw = 2 * 0.62 * fontSize, th = 1.2 * fontSize
  return {
    stack: s,
    slots: { puck: at(1, 0), dontCome: at(0, 0), come: at(0, 1), lay: at(1, 1), place, comeOdds: at(0.3, 0.6), dontComeOdds: at(0.3, 0.3) },
    label: { x: (w - tw) / 2, y: (h - th) / 2, w: tw, h: th }, fontSize, words: false,
  }
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
 * Bets with no felt area (hi-lo, world, hops; or an area missing in this variant) go to the More bets strip's
 * centre (the felt spreads them along it).
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
  return centre(layout.moreRect)
}
