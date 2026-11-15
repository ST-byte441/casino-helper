import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { CHIP_COLORS, stackChip } from '../../../../components/chips/chips'
import { ActiveBet, BetQuality } from '../../../../lib/types'
import { Area, CrapsLayout, Pt, SpotKey, slotFor } from '../../layout'

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

// Roulette's 28dp stack at the 320dp minimum felt height, growing with the felt but capped for tablets, and
// never wider than ~44% of a number box so its come / place / lay slots stay readable.
const BASE_STACK = 28
const MAX_SCALE = 1.4
const ODDS_SHARE = 0.7

export function stackSizeFor(layout: CrapsLayout): number {
  const scale = Math.min(Math.max(layout.height / 320, 1), MAX_SCALE)
  const boxW = Math.min(...layout.areas.filter(a => a.tone === 'box').map(a => a.rect.w))
  return Math.round(Math.max(20, Math.min(BASE_STACK * scale, boxW * 0.44)))
}

/** A font size that fits `chars` characters on one line in w×h (bold caps are about 0.62em wide). */
const fit = (chars: number, w: number, h: number, share: number, max = 40) =>
  Math.max(7, Math.min(h * share, (w * 0.9) / (Math.max(chars, 1) * 0.62), max))

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

function AreaView({ area, lit, tint, fieldPays3on12 }: {
  area: Area; lit: boolean; tint: string | null; fieldPays3on12: boolean
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
      <Label area={area} fieldPays3on12={fieldPays3on12} />
    </View>
  )
}

function Label({ area, fieldPays3on12 }: { area: Area; fieldPays3on12: boolean }) {
  const { w, h } = area.rect
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
    case 'box': return one(area.label, fit(area.label.length, w, h, 0.36), YELLOW)
    case 'prop': return one(area.label, fit(area.label.length, w, h, 0.45, 22), YELLOW)
    case 'odds': return one(area.label, fit(area.label.length, w, h, 0.4, 14))
    default: return one(area.label, fit(area.label.length, w, h, area.key === 'pass' ? 0.3 : 0.36, 30))
  }
}

function Stack({ id, amount, at, size, tag, dim }: {
  id: string; amount: number; at: Pt; size: number; tag?: string; dim?: boolean
}) {
  const chip = CHIP_COLORS[stackChip(amount)]
  return (
    <View
      testID={`stack-${id}`}
      pointerEvents="none"
      style={[styles.stack, {
        left: at.x - size / 2, top: at.y - size / 2, width: size, height: size, borderRadius: size / 2,
        backgroundColor: chip.bg, borderWidth: Math.max(1.5, size / 14),
      }, dim && styles.dim]}
    >
      <Text style={[styles.stackText, { color: chip.fg, fontSize: size * 0.36 }]} numberOfLines={1} adjustsFontSizeToFit>
        ${amount}
      </Text>
      {tag && (
        <View style={[styles.tag, { top: size - 3 }]}>
          <Text style={[styles.tagText, { fontSize: Math.max(7, size * 0.26) }]} numberOfLines={1}>{tag}</Text>
        </View>
      )}
    </View>
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

const TAGS: Partial<Record<ActiveBet['type'], string>> = { buy: 'BUY', lay: 'LAY' }

type Drawn = { key: string; amount: number; at: Pt; size: number; tag?: string; dim?: boolean }

/** Every stack to draw: each bet at its slot, plus its odds as a smaller stack beside it or behind the line. */
export function feltStacks(layout: CrapsLayout, bets: ActiveBet[], point: number | null): Drawn[] {
  const size = stackSizeFor(layout)
  const small = Math.round(size * ODDS_SHARE)
  const top = layout.anchors['any-7'], bottom = layout.anchors['any-craps']
  const fallback = { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 }
  const isFallback = (p: Pt) => p.x === fallback.x && p.y === fallback.y
  const fanned = bets.filter(b => isFallback(slotFor(layout, b)))
  const keep = (p: Pt, s: number): Pt => ({
    x: clamp(p.x, s / 2, layout.width - s / 2), y: clamp(p.y, s / 2, layout.height - s / 2),
  })

  const out: Drawn[] = []
  for (const b of bets) {
    let at = slotFor(layout, b)
    // More-bets bets (hi-lo, world, hops) share the props-box centre: fan them out in a row, overlapping like a
    // dealer's spread, so none hides another.
    const i = fanned.indexOf(b)
    if (i >= 0) at = { x: at.x + (i - (fanned.length - 1) / 2) * size * 0.6, y: at.y }
    at = keep(at, size)
    out.push({ key: b.id, amount: b.amount, at, size, tag: TAGS[b.type], dim: !b.working })

    if (!b.odds || b.odds <= 0) continue
    let oddsAt: Pt | null = null
    if (b.type === 'pass' && point != null && layout.anchors['pass-odds']) oddsAt = layout.anchors['pass-odds']
    else if (b.type === 'dont-pass' && point != null && layout.anchors['dont-pass-odds']) oddsAt = layout.anchors['dont-pass-odds']
    else if ((b.type === 'come' || b.type === 'dont-come') && b.comePoint != null) {
      // Beside its come point, toward the box's middle, slightly lower (odds sit offset on the flat bet).
      oddsAt = { x: at.x + size * 0.5, y: at.y + size * 0.4 }
    }
    if (oddsAt) out.push({ key: `${b.id}-odds`, amount: b.odds, at: keep(oddsAt, small), size: small, dim: !b.working })
  }
  return out
}

export function CrapsFelt({ layout, bets, point, highlight, quality, fieldPays3on12 }: Props) {
  const size = stackSizeFor(layout)
  const areas = point == null ? layout.areas.filter(a => a.tone !== 'odds') : layout.areas
  const puckSlot = point != null ? layout.boxSlots[point]?.puck : undefined
  const puckSize = Math.round(size * 0.95)

  return (
    <View testID="craps-felt" style={[styles.felt, { width: layout.width, height: layout.height }]}>
      {areas.map(a => {
        const q = quality?.(a.key) ?? null
        return (
          <AreaView key={a.key} area={a} lit={highlight === a.key} tint={q ? QUALITY_COLORS[q] : null}
            fieldPays3on12={fieldPays3on12} />
        )
      })}
      {puckSlot
        ? <Puck on at={puckSlot} size={puckSize} />
        : <Puck on={false} at={layout.offPuck} size={puckSize} />}
      {feltStacks(layout, bets, point).map(s => (
        <Stack key={s.key} id={s.key} amount={s.amount} at={s.at} size={s.size} tag={s.tag} dim={s.dim} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  felt: { backgroundColor: FELT, overflow: 'hidden' },
  area: { position: 'absolute', borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', paddingHorizontal: 2 },
  label: { fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  fieldRow: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-between', paddingHorizontal: 6 },
  stack: { position: 'absolute', borderStyle: 'dashed', borderColor: YELLOW, alignItems: 'center',
    justifyContent: 'center' },
  stackText: { fontWeight: '800' },
  dim: { opacity: 0.55 },
  tag: { position: 'absolute', alignSelf: 'center', backgroundColor: '#000', borderRadius: 3, paddingHorizontal: 3 },
  tagText: { color: YELLOW, fontWeight: '800' },
  puck: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  puckOn: { backgroundColor: '#fff', borderColor: '#000' },
  puckOff: { backgroundColor: '#111', borderColor: '#fff' },
  puckText: { fontWeight: '900' },
})
