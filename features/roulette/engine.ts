import { Pocket, RouletteBet, RouletteBetKind, RouletteWheel, PlacedBets } from '../../lib/types'
import { ROULETTE_TABLE_MIN } from '../../lib/constants'

export const ZERO: Pocket = 0
export const DOUBLE_ZERO: Pocket = -1
export const TRIPLE_ZERO: Pocket = -2

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

// Clockwise pocket order, from assets/rules-docs/roulette-rules.md
const DOUBLE_SEQUENCE: Pocket[] = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, -1, 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2]
const SINGLE_SEQUENCE: Pocket[] = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const TRIPLE_SEQUENCE: Pocket[] = [0, -2, -1, ...SINGLE_SEQUENCE.slice(1)]

export const PAYOUTS: Record<RouletteBetKind, number> = {
  straight: 35, split: 17, street: 11, basket: 11, corner: 8, firstFour: 8, firstFive: 6,
  sixline: 5, dozen: 2, column: 2, low: 1, high: 1, red: 1, black: 1, odd: 1, even: 1,
}

const INSIDE_KINDS: RouletteBetKind[] = ['straight', 'split', 'street', 'corner', 'sixline', 'basket', 'firstFour', 'firstFive']

export function pocketLabel(p: Pocket): string {
  if (p === DOUBLE_ZERO) return '00'
  if (p === TRIPLE_ZERO) return '000'
  return String(p)
}

export function pocketColor(p: Pocket): 'red' | 'black' | 'green' {
  if (p <= 0) return 'green'
  return RED_NUMBERS.has(p) ? 'red' : 'black'
}

export function wheelSequence(wheel: RouletteWheel): Pocket[] {
  if (wheel === 'single') return [...SINGLE_SEQUENCE]
  if (wheel === 'double') return [...DOUBLE_SEQUENCE]
  return [...TRIPLE_SEQUENCE]
}

export function zeroPockets(wheel: RouletteWheel): Pocket[] {
  if (wheel === 'single') return [ZERO]
  if (wheel === 'double') return [ZERO, DOUBLE_ZERO]
  return [ZERO, TRIPLE_ZERO, DOUBLE_ZERO]
}

export function isInsideKind(kind: RouletteBetKind): boolean {
  return INSIDE_KINDS.includes(kind)
}

export function makeBetId(kind: RouletteBetKind, pockets: Pocket[]): string {
  if (!isInsideKind(kind)) return kind
  const labels = [...pockets].sort((a, b) => a - b).map(pocketLabel)
  return `${kind}:${labels.join('-')}`
}

function cell(r: number, c: number): Pocket {
  return 3 * (r - 1) + c
}

function inside(kind: RouletteBetKind, pockets: Pocket[]): RouletteBet {
  return { id: makeBetId(kind, pockets), kind, pockets }
}

function range(from: number, to: number): Pocket[] {
  const out: Pocket[] = []
  for (let i = from; i <= to; i++) out.push(i)
  return out
}

function buildBets(wheel: RouletteWheel): RouletteBet[] {
  const bets: RouletteBet[] = []
  for (const p of wheelSequence(wheel).sort((a, b) => a - b)) bets.push(inside('straight', [p]))

  for (let r = 1; r <= 12; r++) {
    for (let c = 1; c <= 2; c++) bets.push(inside('split', [cell(r, c), cell(r, c + 1)]))
  }
  for (let r = 1; r <= 11; r++) {
    for (let c = 1; c <= 3; c++) bets.push(inside('split', [cell(r, c), cell(r + 1, c)]))
  }
  for (let r = 1; r <= 12; r++) bets.push(inside('street', [cell(r, 1), cell(r, 2), cell(r, 3)]))
  for (let r = 1; r <= 11; r++) {
    for (let c = 1; c <= 2; c++) {
      bets.push(inside('corner', [cell(r, c), cell(r, c + 1), cell(r + 1, c), cell(r + 1, c + 1)]))
    }
  }
  for (let r = 1; r <= 11; r++) bets.push(inside('sixline', range(cell(r, 1), cell(r + 1, 3))))

  if (wheel === 'single') {
    for (const n of [1, 2, 3]) bets.push(inside('split', [0, n]))
    bets.push(inside('basket', [0, 1, 2]), inside('basket', [0, 2, 3]))
    bets.push(inside('firstFour', [0, 1, 2, 3]))
  } else if (wheel === 'double') {
    bets.push(inside('split', [0, 1]), inside('split', [0, 2]), inside('split', [-1, 2]), inside('split', [-1, 3]), inside('split', [-1, 0]))
    bets.push(inside('basket', [0, 1, 2]), inside('basket', [-1, 0, 2]), inside('basket', [-1, 2, 3]))
    bets.push(inside('firstFive', [-1, 0, 1, 2, 3]))
  } else {
    bets.push(inside('split', [0, -2]), inside('split', [-2, -1]))
  }

  const nums = range(1, 36)
  for (const d of [1, 2, 3]) {
    bets.push({ id: `dozen:${d}`, kind: 'dozen', pockets: range(12 * (d - 1) + 1, 12 * d) })
    bets.push({ id: `column:${d}`, kind: 'column', pockets: nums.filter(n => (n - 1) % 3 === d - 1) })
  }
  bets.push({ id: 'low', kind: 'low', pockets: range(1, 18) })
  bets.push({ id: 'high', kind: 'high', pockets: range(19, 36) })
  bets.push({ id: 'red', kind: 'red', pockets: nums.filter(n => pocketColor(n) === 'red') })
  bets.push({ id: 'black', kind: 'black', pockets: nums.filter(n => pocketColor(n) === 'black') })
  bets.push({ id: 'odd', kind: 'odd', pockets: nums.filter(n => n % 2 === 1) })
  bets.push({ id: 'even', kind: 'even', pockets: nums.filter(n => n % 2 === 0) })
  return bets
}

const betCache: Partial<Record<RouletteWheel, RouletteBet[]>> = {}
const betIndex: Partial<Record<RouletteWheel, Map<string, RouletteBet>>> = {}

export function allBets(wheel: RouletteWheel): RouletteBet[] {
  let bets = betCache[wheel]
  if (!bets) {
    bets = buildBets(wheel)
    betCache[wheel] = bets
    betIndex[wheel] = new Map(bets.map(b => [b.id, b]))
  }
  return bets
}

export function betById(wheel: RouletteWheel, id: string): RouletteBet | undefined {
  allBets(wheel)
  return betIndex[wheel]!.get(id)
}

export function totalStake(bets: PlacedBets): number {
  return Object.values(bets).reduce((sum, s) => sum + s, 0)
}

export function validateBets(bets: PlacedBets, wheel: RouletteWheel): string | null {
  const entries = Object.entries(bets)
  let insideTotal = 0
  let hasInside = false
  let outsideShort = false
  for (const [id, stake] of entries) {
    const bet = betById(wheel, id)
    if (!bet) return 'Invalid bet'
    if (isInsideKind(bet.kind)) {
      hasInside = true
      insideTotal += stake
    } else if (stake < ROULETTE_TABLE_MIN) {
      outsideShort = true
    }
  }
  if (entries.length === 0) return 'Place a bet'
  if (hasInside && insideTotal < ROULETTE_TABLE_MIN) return `Inside bets need $${ROULETTE_TABLE_MIN} total`
  if (outsideShort) return `Outside bets need $${ROULETTE_TABLE_MIN} each`
  return null
}

export function settleSpin(bets: PlacedBets, wheel: RouletteWheel, winning: Pocket): { net: number; winners: string[] } {
  let net = 0
  const winners: string[] = []
  for (const [id, stake] of Object.entries(bets)) {
    const bet = betById(wheel, id)
    if (bet && bet.pockets.includes(winning)) {
      net += stake * PAYOUTS[bet.kind]
      winners.push(id)
    } else {
      net -= stake
    }
  }
  return { net, winners }
}

export function pickPocket(wheel: RouletteWheel, rng: () => number = Math.random): Pocket {
  const seq = wheelSequence(wheel)
  return seq[Math.floor(rng() * seq.length)]
}
