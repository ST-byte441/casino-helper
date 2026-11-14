import { View, Text, StyleSheet } from 'react-native'
import { PlacedBets, Pocket, RouletteWheel } from '../../../lib/types'
import { ROULETTE_CHIPS } from '../../../lib/constants'
import { betById, makeBetId } from '../engine'
import { BoardCell, BoardLayout } from '../layout'

type Props = { wheel: RouletteWheel; layout: BoardLayout; bets: PlacedBets; marker: Pocket | null; highlight: string | null }

const SPOT = 22

export const FELT = '#0f5132'
export const POCKET_BG: Record<BoardCell['color'], string> = {
  red: '#c62828', black: '#111', green: '#1b8a4a', felt: FELT,
}
export const CHIP_COLORS: Record<number, { bg: string; fg: string }> = {
  1: { bg: '#fff', fg: '#000' },
  5: { bg: '#c62828', fg: '#fff' },
  25: { bg: '#2e7d32', fg: '#fff' },
  100: { bg: '#111', fg: '#fff' },
}
export const STACK_SIZE = 28

/** A stack is drawn in the colour of the largest chip its total covers. */
export function stackChip(total: number): number {
  return [...ROULETTE_CHIPS].reverse().find(c => c <= total) ?? ROULETTE_CHIPS[0]
}

function Cell({ cell, lit }: { cell: BoardCell; lit: boolean }) {
  const { x, y, w, h } = cell.rect
  // Tall outside boxes (portrait dozens and even-money) read sideways.
  const sideways = !cell.key.startsWith('straight:') && h > w * 1.5
  return (
    <View
      testID={`cell-${cell.key}`}
      style={[styles.cell, { left: x, top: y, width: w, height: h, backgroundColor: POCKET_BG[cell.color] },
        lit && styles.lit]}
    >
      <Text
        numberOfLines={1}
        style={[styles.label, sideways && { width: h, transform: [{ rotate: '-90deg' }] }]}
      >
        {cell.label}
      </Text>
    </View>
  )
}

export function Stack({ total, x, y, betId }: { total: number; x: number; y: number; betId: string }) {
  const chip = CHIP_COLORS[stackChip(total)]
  return (
    <View
      testID={`stack-${betId}`}
      pointerEvents="none"
      style={[styles.stack, { left: x - STACK_SIZE / 2, top: y - STACK_SIZE / 2, backgroundColor: chip.bg }]}
    >
      <Text style={[styles.stackText, { color: chip.fg }]} numberOfLines={1} adjustsFontSizeToFit>${total}</Text>
    </View>
  )
}

/**
 * Cell keys to light for the bet under the dragged chip. A straight or outside bet lights its own cell; a bet
 * on a line or corner (split, street, corner, six line, basket, first four/five) has no cell, so every number
 * it covers lights up — the dragged chip itself hides the small spot on the line.
 */
function litKeys(wheel: RouletteWheel, layout: BoardLayout, highlight: string | null): Set<string> {
  if (highlight === null) return new Set()
  const own = layout.cells.find(c => c.betId === highlight)
  if (own) return new Set([own.key])
  const bet = betById(wheel, highlight)
  return new Set(bet ? bet.pockets.map(p => makeBetId('straight', [p])) : [])
}

export function Board({ wheel, layout, bets, marker, highlight }: Props) {
  const markerCell = marker === null ? undefined : layout.cells.find(c => c.key === makeBetId('straight', [marker]))
  const lit = litKeys(wheel, layout, highlight)
  const litIsCell = highlight !== null && layout.cells.some(c => c.betId === highlight)
  const spot = highlight !== null && !litIsCell ? layout.anchors[highlight] : undefined

  return (
    <View style={[styles.board, { width: layout.width, height: layout.height }]}>
      {layout.cells.map(c => <Cell key={c.key} cell={c} lit={lit.has(c.key)} />)}
      {spot && (
        <View testID="highlight-spot" pointerEvents="none"
          style={[styles.spot, { left: spot.x - SPOT / 2, top: spot.y - SPOT / 2 }]} />
      )}
      {markerCell && (
        <View
          testID="roulette-marker"
          pointerEvents="none"
          style={[styles.marker, {
            left: markerCell.rect.x + markerCell.rect.w / 2 - 9,
            top: markerCell.rect.y + markerCell.rect.h / 2 - 9,
          }]}
        />
      )}
      {Object.entries(bets).map(([id, total]) => {
        const a = layout.anchors[id]
        return a ? <Stack key={id} betId={id} total={total} x={a.x} y={a.y} /> : null
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  board: { backgroundColor: FELT },
  cell: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth, borderColor: '#e8e8e8',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lit: { borderWidth: 2, borderColor: '#FFD700' },
  label: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  spot: { position: 'absolute', width: SPOT, height: SPOT, borderRadius: SPOT / 2, borderWidth: 2,
    borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.5)' },
  marker: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#FFD700' },
  stack: { position: 'absolute', width: STACK_SIZE, height: STACK_SIZE, borderRadius: STACK_SIZE / 2,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#FFD700', alignItems: 'center', justifyContent: 'center' },
  stackText: { fontSize: 10, fontWeight: '800' },
})
