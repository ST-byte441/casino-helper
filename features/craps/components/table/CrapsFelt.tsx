import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { CHIP_COLORS, stackChip } from '../../../../components/chips/chips'
import { ActiveBet, BetQuality } from '../../../../lib/types'
import { payoutCheck } from '../../assist'
import { Area, BoxLabel, CrapsLayout, Pt, Rect, SpotKey, fit, oddsSizeFor, puckSizeFor, slotFor, stackSizeFor } from '../../layout'

/*
 * The drawn craps felt: areas, chip stacks and the puck. Purely presentational (no gestures, no store);
 * the table screen lays its gestures over it.
 */

type Props = {
  layout: CrapsLayout
  bets: ActiveBet[]
  point: number | null
  /** The drop / tap target to light, or null. */
  highlight: SpotKey | null
  /** Assist: tints an area's border by the quality of its bet. */
  quality?: (key: SpotKey) => BetQuality | null
  /** Assist: a ring round each Place stack and odds chip, green when it pays exactly, amber when it doesn't. */
  payoutRings?: boolean
  fieldPays3on12: boolean
}

export const FELT = '#0f5132'
const ODDS_FELT = '#146b43'
const LINE = 'rgba(255,255,255,0.85)'
const YELLOW = '#FFD700'
const LIT_BG = 'rgba(255,215,0,0.3)'

/** The craps list's Assist colours (BetRow / BetCategoryPanel). */
export const QUALITY_COLORS: Record<BetQuality, string> = {
  optimal: '#FFD700',
  acceptable: '#fff',
  poor: '#FFA500',
  avoid: '#e74c3c',
}

const FIELD_NUMBERS = '2 · 3 · 4 · 9 · 10 · 11 · 12'
const LOW_NUMBERS = '2 · 3 · 4'
const HIGH_NUMBERS = '10 · 11 · 12'


export { stackSizeFor }

// A stack's amount never shrinks below this, so a small odds chip still reads.
const MIN_AMOUNT_FONT = 8

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

function AreaView({ area, labelBox, boxLabel, lit, tint, fieldPays3on12 }: {
  area: Area; labelBox?: Rect; boxLabel?: BoxLabel; lit: boolean; tint: string | null; fieldPays3on12: boolean
}) {
  const { x, y, w, h } = area.rect
  const border = lit ? { borderColor: YELLOW, borderWidth: 2 } : tint ? { borderColor: tint, borderWidth: 2 } : null
  return (
    <View
      testID={`area-${area.key}`}
      pointerEvents="none"
      style={[styles.area, { left: x, top: y, width: w, height: h },
        { backgroundColor: area.tone === 'odds' ? ODDS_FELT : FELT }, border, lit && { backgroundColor: LIT_BG }]}
    >
      {labelBox ? (
        // Its own label box (line bands: left of centre, clear of the odds strip).
        <View testID={`label-${area.key}`} style={[styles.labelBox, {
          left: labelBox.x - x, top: labelBox.y - y, width: labelBox.w, height: labelBox.h,
        }]}>
          {boxLabel
            ? <Text numberOfLines={1} style={[styles.label, { fontSize: boxLabel.fontSize, color: YELLOW }]}>{boxLabel.text}</Text>
            : <Label area={area} box={labelBox} fieldPays3on12={fieldPays3on12} />}
        </View>
      ) : <Label area={area} box={area.rect} fieldPays3on12={fieldPays3on12} />}
    </View>
  )
}

function Label({ area, box, fieldPays3on12 }: { area: Area; box: Rect; fieldPays3on12: boolean }) {
  const { w, h } = box
  const one = (text: string, size: number, color = '#fff') => (
    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.label, { fontSize: size, color }]}>{text}</Text>
  )
  if (area.key === 'field') {
    const twelve = fieldPays3on12 ? '12 PAYS TRIPLE' : '12 PAYS DOUBLE'
    const small = fit(14 * 2 + 6, w, h, 0.2, 16)
    return (
      <>
        {one(FIELD_NUMBERS, fit(FIELD_NUMBERS.length, w, h, 0.36, 28), YELLOW)}
        <View style={styles.fieldRow}>
          {one('2 PAYS DOUBLE', small)}
          {one('FIELD', small, YELLOW)}
          {one(twelve, small)}
        </View>
      </>
    )
  }
  if (area.key === 'low-field' || area.key === 'high-field') {
    const nums = area.key === 'low-field' ? LOW_NUMBERS : HIGH_NUMBERS
    return (
      <>
        {one(nums, fit(nums.length, w, h, 0.34, 26), YELLOW)}
        {one(area.label, fit(area.label.length, w, h, 0.2, 16))}
      </>
    )
  }
  switch (area.tone) {
    case 'prop': return one(area.label, fit(area.label.length, w, h, 0.45, 22), YELLOW)
    case 'odds': return one(area.label, fit(area.label.length, w, h, 0.4, 14))
    default: {
      const share = area.key === 'pass' ? 0.32 : area.key === 'dont-pass' ? 0.4 : 0.36
      return one(area.label, fit(area.label.length, w, h, share, 30))
    }
  }
}

/** Payout ring colours (Assist): pays exactly / is rounded down. */
export const PAYOUT_RING = { exact: '#2ecc71', inexact: '#f39c12' } as const

/** Which payout ring a drawn stack gets: Place stacks on their amount, odds chips on the odds; null for the rest. */
function ringFor(key: string, bets: ActiveBet[], point: number | null): keyof typeof PAYOUT_RING | null {
  const odds = key.endsWith('-odds')
  const bet = bets.find(b => b.id === (odds ? key.slice(0, -'-odds'.length) : key))
  const check = bet ? payoutCheck(bet, point) : null
  if (!check || (check.kind === 'place') === odds) return null
  return check.exact ? 'exact' : 'inexact'
}

function Stack({ id, amount, at, size, tag, dim, ring }: {
  id: string; amount: number; at: Pt; size: number; tag?: string; dim?: boolean; ring?: keyof typeof PAYOUT_RING | null
}) {
  const chip = CHIP_COLORS[stackChip(amount)]
  const amountFont = Math.max(MIN_AMOUNT_FONT, size * 0.36)
  const ringW = Math.max(2, size / 11)
  const outer = size + 2 * ringW + 2
  return (
    <>
    {ring && (
      <View testID={`ring-${id}`} pointerEvents="none" style={[styles.ring, {
        left: at.x - outer / 2, top: at.y - outer / 2, width: outer, height: outer, borderRadius: outer / 2,
        borderWidth: ringW, borderColor: PAYOUT_RING[ring],
      }]} />
    )}
    <View
      testID={`stack-${id}`}
      pointerEvents="none"
      style={[styles.stack, {
        left: at.x - size / 2, top: at.y - size / 2, width: size, height: size, borderRadius: size / 2,
        backgroundColor: chip.bg, borderWidth: Math.max(1.5, size / 14),
      }, dim && styles.dim]}
    >
      <Text style={[styles.stackText, { color: chip.fg, fontSize: amountFont }]} numberOfLines={1} adjustsFontSizeToFit
        minimumFontScale={MIN_AMOUNT_FONT / amountFont}>
        ${amount}
      </Text>
      {tag && (
        <View style={[styles.tag, { top: size - 3 }]}>
          <Text style={[styles.tagText, { fontSize: Math.max(7, size * 0.26) }]} numberOfLines={1}>{tag}</Text>
        </View>
      )}
    </View>
    </>
  )
}

function Puck({ on, at, size }: { on: boolean; at: Pt; size: number }) {
  return (
    <View
      testID={on ? 'puck-on' : 'puck-off'}
      pointerEvents="none"
      style={[styles.puck, on ? styles.puckOn : styles.puckOff,
        { left: at.x - size / 2, top: at.y - size / 2, width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.puckText, { color: on ? '#000' : '#fff', fontSize: size * 0.34 }]} numberOfLines={1}>
        {on ? 'ON' : 'OFF'}
      </Text>
    </View>
  )
}

const TAGS: Partial<Record<ActiveBet['type'], string>> = { buy: 'BUY', lay: 'LAY', world: 'WORLD', 'hi-lo': 'HI-LO' }

const tagFor = (b: ActiveBet): string | undefined =>
  (b.type === 'hop-easy' || b.type === 'hop-hard') && b.hopDice ? `${b.hopDice[0]}-${b.hopDice[1]}` : TAGS[b.type]

type Drawn = { key: string; amount: number; at: Pt; size: number; tag?: string; dim?: boolean }

/** The bets placed from the More bets panel: Buy, Lay, World, Hi-Lo and Hops. */
const MORE_BET_TYPES: ReadonlySet<ActiveBet['type']> = new Set(['buy', 'lay', 'world', 'hi-lo', 'hop-easy', 'hop-hard'])

/** The chips down on More bets panel bets (flat plus odds), 0 when there are none. */
export function moreBetsTotal(bets: ActiveBet[]): number {
  return bets.filter(b => MORE_BET_TYPES.has(b.type)).reduce((sum, b) => sum + b.amount + (b.odds ?? 0), 0)
}

/** Room left for a chip's tag under it in the More bets strip. */
const STRIP_PAD = 2

/**
 * The More bets strip's row: the bets with no felt area of their own (World, Hi-Lo, Hops), one slot each, side by
 * side. When more are down than the strip holds, the last slot shows a "+N" count of the rest instead (they stay
 * in the More bets panel).
 */
export function moreBetsRow(layout: CrapsLayout, bets: ActiveBet[]): {
  slots: Map<string, Pt>; overflow: { count: number; at: Pt; size: number } | null
} {
  const size = stackSizeFor(layout)
  const m = layout.moreRect
  const home = { x: m.x + m.w / 2, y: m.y + m.h / 2 }
  const row = bets.filter(b => { const p = slotFor(layout, b); return p.x === home.x && p.y === home.y })
  const pitch = size + STRIP_PAD
  const fits = Math.max(1, Math.floor((m.w - STRIP_PAD * 2) / pitch))
  const shown = row.length > fits ? row.slice(0, fits - 1) : row
  const n = row.length > fits ? fits : row.length
  const y = m.y + Math.min(m.h / 2, size / 2 + STRIP_PAD)
  const at = (i: number): Pt => ({ x: m.x + (m.w - n * pitch) / 2 + pitch * (i + 0.5), y })
  const slots = new Map(shown.map((b, i) => [b.id, at(i)] as [string, Pt]))
  const overflow = row.length > fits ? { count: row.length - shown.length, at: at(fits - 1), size } : null
  return { slots, overflow }
}

/** Every stack to draw: each bet at its slot, plus its odds as a smaller stack beside it or behind the line. */
export function feltStacks(layout: CrapsLayout, bets: ActiveBet[], point: number | null): Drawn[] {
  const size = stackSizeFor(layout)
  const small = oddsSizeFor(size)
  const more = moreBetsRow(layout, bets)
  const keep = (p: Pt, s: number): Pt => ({
    x: clamp(p.x, s / 2, layout.width - s / 2), y: clamp(p.y, s / 2, layout.height - s / 2),
  })

  const out: Drawn[] = []
  for (const b of bets) {
    let at = slotFor(layout, b)
    // More-bets bets (hi-lo, world, hops) sit side by side in the More bets strip; any past its "+N" aren't drawn.
    const m = layout.moreRect
    if (at.x === m.x + m.w / 2 && at.y === m.y + m.h / 2) {
      const slot = more.slots.get(b.id)
      if (!slot) continue
      at = slot
    }
    at = keep(at, size)
    out.push({ key: b.id, amount: b.amount, at, size, tag: tagFor(b), dim: !b.working })

    if (!b.odds || b.odds <= 0) continue
    let oddsAt: Pt | null = null
    if (b.type === 'pass' && point != null && layout.anchors['pass-odds']) oddsAt = layout.anchors['pass-odds']
    else if (b.type === 'dont-pass' && point != null && layout.anchors['dont-pass-odds']) oddsAt = layout.anchors['dont-pass-odds']
    else if ((b.type === 'come' || b.type === 'dont-come') && b.comePoint != null && layout.boxSlots[b.comePoint]) {
      // Offset on the flat bet, where the layout keeps it off the box's number.
      const s = layout.boxSlots[b.comePoint]
      oddsAt = b.type === 'come' ? s.comeOdds : s.dontComeOdds
    }
    if (oddsAt) out.push({ key: `${b.id}-odds`, amount: b.odds, at: keep(oddsAt, small), size: small, dim: !b.working })
  }
  return out
}

export function CrapsFelt({ layout, bets, point, highlight, quality, payoutRings, fieldPays3on12 }: Props) {
  const size = stackSizeFor(layout)
  const areas = point == null ? layout.areas.filter(a => a.tone !== 'odds') : layout.areas
  const puckSlot = point != null ? layout.boxSlots[point]?.puck : undefined
  const puckSize = puckSizeFor(layout)
  const m = layout.moreRect
  const overflow = moreBetsRow(layout, bets).overflow
  // The strip opens the More bets panel; it lights up while chips are down on that panel's bets.
  const moreTotal = moreBetsTotal(bets)

  return (
    <View testID="craps-felt" style={[styles.felt, { width: layout.width, height: layout.height }]}>
      {areas.map(a => {
        const q = quality?.(a.key) ?? null
        return (
          <AreaView key={a.key} area={a} labelBox={layout.labels[a.key]}
            boxLabel={a.tone === 'box' ? layout.boxLabels[Number(a.key.slice(4))] : undefined} lit={highlight === a.key} tint={q ? QUALITY_COLORS[q] : null}
            fieldPays3on12={fieldPays3on12} />
        )
      })}
      <View testID="more-bets-strip" pointerEvents="none"
        style={[styles.strip, moreTotal > 0 && styles.stripOn, { left: m.x, top: m.y, width: m.w, height: m.h }]}>
        <Text testID="more-bets-strip-label" numberOfLines={1} adjustsFontSizeToFit
          style={[styles.stripText, moreTotal > 0 && styles.stripTextOn, { fontSize: fit(9, m.w, m.h, 0.3, 12) }]}>
          {moreTotal > 0 ? `MORE BETS · $${moreTotal} ›` : 'MORE BETS ›'}
        </Text>
      </View>
      {puckSlot
        ? <Puck on at={puckSlot} size={puckSize} />
        : <Puck on={false} at={layout.offPuck} size={puckSize} />}
      {feltStacks(layout, bets, point).map(s => (
        <Stack key={s.key} id={s.key} amount={s.amount} at={s.at} size={s.size} tag={s.tag} dim={s.dim}
          ring={payoutRings ? ringFor(s.key, bets, point) : null} />
      ))}
      {overflow && (
        <View testID="more-bets-overflow" pointerEvents="none" style={[styles.overflow, {
          left: overflow.at.x - overflow.size / 2, top: overflow.at.y - overflow.size / 2,
          width: overflow.size, height: overflow.size, borderRadius: overflow.size / 2,
        }]}>
          <Text style={[styles.stackText, { color: '#fff', fontSize: overflow.size * 0.36 }]} numberOfLines={1}
            adjustsFontSizeToFit>+{overflow.count}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  felt: { backgroundColor: FELT, overflow: 'hidden' },
  area: { position: 'absolute', borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', paddingHorizontal: 2 },
  label: { fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  labelBox: { position: 'absolute', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-between', paddingHorizontal: 6 },
  ring: { position: 'absolute' },
  stack: { position: 'absolute', borderStyle: 'dashed', borderColor: YELLOW, alignItems: 'center',
    justifyContent: 'center' },
  stackText: { fontWeight: '800' },
  dim: { opacity: 0.55 },
  tag: { position: 'absolute', alignSelf: 'center', backgroundColor: '#000', borderRadius: 3, paddingHorizontal: 3 },
  tagText: { color: YELLOW, fontWeight: '800' },
  strip: { position: 'absolute', borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden' },
  stripText: { color: 'rgba(255,255,255,0.6)', fontWeight: '800', letterSpacing: 0.5 },
  stripOn: { borderWidth: 2, borderColor: YELLOW, backgroundColor: 'rgba(255,215,0,0.14)' },
  stripTextOn: { color: YELLOW },
  overflow: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000',
    borderWidth: 1.5, borderColor: YELLOW },
  puck: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  puckOn: { backgroundColor: '#fff', borderColor: '#000' },
  puckOff: { backgroundColor: '#111', borderColor: '#fff' },
  puckText: { fontWeight: '900' },
})
