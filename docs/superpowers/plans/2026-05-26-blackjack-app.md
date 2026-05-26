# Blackjack App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable React Native blackjack app with multi-profile bankroll management, configurable Vegas table rules, and a basic-strategy assist highlight.

**Architecture:** Feature-folder structure — each game owns its components, store, engine, and strategy. Pure TypeScript engine/strategy files have no React dependencies and are fully unit-testable. A persisted profile store holds bankroll state shared across all games.

**Tech Stack:** Expo (Managed), TypeScript, Expo Router, Zustand + AsyncStorage, Jest + React Native Testing Library

---

## File Map

| File | Responsibility |
|---|---|
| `lib/types.ts` | All shared types: Card, Action, Outcome, Phase, TableRules, PayoutMode, SoftSeven, SurrenderMode, DeckCount |
| `lib/constants.ts` | SUITS, VALUES, DEFAULT_TABLE_RULES, CHIP_DENOMINATIONS |
| `features/profile/types.ts` | Profile, BankrollMode |
| `features/profile/store.ts` | useProfileStore (persisted Zustand) |
| `features/profile/components/ProfileCard.tsx` | Name + balance display chip |
| `features/profile/components/ProfileList.tsx` | Scrollable list of profiles |
| `features/profile/components/CreateProfileModal.tsx` | Name + chips + infinite toggle form |
| `features/blackjack/engine.ts` | Pure TS: deck, scoring, rule checks, hand resolution |
| `features/blackjack/strategy.ts` | Pure TS: basic strategy lookup table |
| `features/blackjack/store.ts` | useBlackjackStore (session Zustand) |
| `features/blackjack/components/Card.tsx` | Single card View |
| `features/blackjack/components/Hand.tsx` | Row of cards + score |
| `features/blackjack/components/ActionButtons.tsx` | Hit/Stand/Double/Split/Surrender with assist highlight |
| `features/blackjack/components/BetControls.tsx` | $15/$25/$50 chip buttons + Clear + Deal |
| `features/blackjack/components/TableSetup.tsx` | Pre-game rule configuration screen |
| `app/_layout.tsx` | Root layout |
| `app/(tabs)/_layout.tsx` | Tab bar config |
| `app/(tabs)/index.tsx` | Game lobby |
| `app/(tabs)/profile.tsx` | Profile switcher screen |
| `app/blackjack/index.tsx` | Blackjack table screen |

---

## Task 1: Scaffold the Expo project

**Files:**
- Create: project root (run from `/home/adduser/projects/untitledMobile`)

- [ ] **Step 1: Create the Expo app**

```bash
cd /home/adduser/projects/untitledMobile
npx create-expo-app@latest . --template blank-typescript
```

When prompted to overwrite, confirm yes. This installs Expo, React Native, and TypeScript.

- [ ] **Step 2: Install dependencies**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npm install zustand
npx expo install @react-native-async-storage/async-storage
npm install --save-dev jest @types/jest jest-expo @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 3: Configure Expo Router in `package.json`**

Open `package.json`. Set the `main` field and add Jest config:

```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "test": "jest --watchAll=false",
    "test:watch": "jest --watchAll"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ]
  }
}
```

- [ ] **Step 4: Configure `app.json` for Expo Router**

Open `app.json` and ensure the scheme field exists:

```json
{
  "expo": {
    "name": "UntitledMobile",
    "slug": "untitled-mobile",
    "version": "1.0.0",
    "scheme": "untitledmobile",
    "web": {
      "bundler": "metro"
    },
    "plugins": ["expo-router"]
  }
}
```

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p app/\(tabs\) app/blackjack
mkdir -p features/blackjack/components
mkdir -p features/profile/components
mkdir -p lib
mkdir -p __tests__/blackjack
mkdir -p __tests__/profile
```

- [ ] **Step 6: Verify the app starts**

```bash
npx expo start --no-dev --minify
```

Expected: Metro bundler starts without errors. Press `q` to quit.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Expo Router TypeScript project"
```

---

## Task 2: Shared types and constants

**Files:**
- Create: `lib/types.ts`
- Create: `lib/constants.ts`

- [ ] **Step 1: Write `lib/types.ts`**

```typescript
export type Suit = '♠' | '♥' | '♦' | '♣'
export type Value = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export type Card = {
  suit: Suit
  value: Value
  faceDown?: boolean
}

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender'
export type Outcome = 'blackjack' | 'win' | 'lose' | 'push' | 'bust'
export type Phase = 'betting' | 'playing' | 'dealer' | 'result'

export type PayoutMode = '3:2' | '6:5'
export type SoftSeven = 'S17' | 'H17'
export type SurrenderMode = 'none' | 'late' | 'early'
export type DeckCount = 1 | 2 | 6 | 8

export type TableRules = {
  payoutMode: PayoutMode
  dealerSoft17: SoftSeven
  doubleAfterSplit: boolean
  resplitAces: boolean
  surrender: SurrenderMode
  deckCount: DeckCount
}
```

- [ ] **Step 2: Write `lib/constants.ts`**

```typescript
import { Suit, Value, TableRules } from './types'

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
export const VALUES: Value[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

export const CHIP_DENOMINATIONS = [15, 25, 50] as const
export const TABLE_MINIMUM = 15

export const DEFAULT_TABLE_RULES: TableRules = {
  payoutMode: '3:2',
  dealerSoft17: 'H17',
  doubleAfterSplit: true,
  resplitAces: false,
  surrender: 'late',
  deckCount: 6,
}

export const RED_SUITS: Suit[] = ['♥', '♦']
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/constants.ts
git commit -m "feat: add shared types and constants"
```

---

## Task 3: Profile types and store

**Files:**
- Create: `features/profile/types.ts`
- Create: `features/profile/store.ts`
- Create: `__tests__/profile/store.test.ts`

- [ ] **Step 1: Write `features/profile/types.ts`**

```typescript
export type BankrollMode = 'finite' | 'infinite'

export type Profile = {
  id: string
  name: string
  bankrollMode: BankrollMode
  balance: number
  createdAt: number
}
```

- [ ] **Step 2: Write the failing test**

Create `__tests__/profile/store.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react-native'
import { useProfileStore } from '../../features/profile/store'

beforeEach(() => {
  useProfileStore.setState({
    profiles: [],
    activeProfileId: null,
  })
})

test('addProfile creates a profile with the given name and balance', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Alice', 1000, 'finite'))
  expect(result.current.profiles).toHaveLength(1)
  expect(result.current.profiles[0].name).toBe('Alice')
  expect(result.current.profiles[0].balance).toBe(1000)
  expect(result.current.profiles[0].bankrollMode).toBe('finite')
})

test('setActiveProfile sets the activeProfileId', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Bob', 500, 'finite'))
  const id = result.current.profiles[0].id
  act(() => result.current.setActiveProfile(id))
  expect(result.current.activeProfileId).toBe(id)
})

test('updateBalance adds delta to active finite profile', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Carol', 1000, 'finite'))
  const id = result.current.profiles[0].id
  act(() => result.current.setActiveProfile(id))
  act(() => result.current.updateBalance(150))
  expect(result.current.profiles[0].balance).toBe(1150)
})

test('updateBalance is a no-op for infinite profiles', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Dave', 0, 'infinite'))
  const id = result.current.profiles[0].id
  act(() => result.current.setActiveProfile(id))
  act(() => result.current.updateBalance(-500))
  expect(result.current.profiles[0].balance).toBe(0)
})

test('deleteProfile removes the profile', () => {
  const { result } = renderHook(() => useProfileStore())
  act(() => result.current.addProfile('Eve', 200, 'finite'))
  const id = result.current.profiles[0].id
  act(() => result.current.deleteProfile(id))
  expect(result.current.profiles).toHaveLength(0)
})
```

- [ ] **Step 3: Run to confirm it fails**

```bash
npm test -- __tests__/profile/store.test.ts
```

Expected: FAIL — `useProfileStore` not found.

- [ ] **Step 4: Write `features/profile/store.ts`**

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Profile, BankrollMode } from './types'

type ProfileStore = {
  profiles: Profile[]
  activeProfileId: string | null
  addProfile: (name: string, startingChips: number, mode: BankrollMode) => void
  setActiveProfile: (id: string) => void
  updateBalance: (delta: number) => void
  deleteProfile: (id: string) => void
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      addProfile: (name, startingChips, mode) => {
        const profile: Profile = {
          id: Math.random().toString(36).slice(2),
          name,
          bankrollMode: mode,
          balance: startingChips,
          createdAt: Date.now(),
        }
        set(state => ({ profiles: [...state.profiles, profile] }))
      },

      setActiveProfile: (id) => set({ activeProfileId: id }),

      updateBalance: (delta) => {
        const { profiles, activeProfileId } = get()
        const profile = profiles.find(p => p.id === activeProfileId)
        if (!profile || profile.bankrollMode === 'infinite') return
        set({
          profiles: profiles.map(p =>
            p.id === activeProfileId ? { ...p, balance: p.balance + delta } : p
          ),
        })
      },

      deleteProfile: (id) =>
        set(state => ({ profiles: state.profiles.filter(p => p.id !== id) })),
    }),
    {
      name: 'profile-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

- [ ] **Step 5: Run tests and confirm they pass**

```bash
npm test -- __tests__/profile/store.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add features/profile/types.ts features/profile/store.ts __tests__/profile/store.test.ts
git commit -m "feat: add profile store with persist middleware"
```

---

## Task 4: Blackjack engine — deck and scoring

**Files:**
- Create: `features/blackjack/engine.ts`
- Create: `__tests__/blackjack/engine.test.ts`

- [ ] **Step 1: Write failing tests for deck creation and scoring**

Create `__tests__/blackjack/engine.test.ts`:

```typescript
import {
  createDeck,
  dealCard,
  scoreHand,
  isSoft,
} from '../../features/blackjack/engine'
import { Card } from '../../lib/types'

const card = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })

describe('createDeck', () => {
  test('creates 52 cards per deck', () => {
    expect(createDeck(1)).toHaveLength(52)
    expect(createDeck(6)).toHaveLength(312)
  })

  test('contains 4 aces in a single deck', () => {
    const deck = createDeck(1)
    expect(deck.filter(c => c.value === 'A')).toHaveLength(4)
  })
})

describe('dealCard', () => {
  test('removes the top card from the deck', () => {
    const deck = createDeck(1)
    const [dealtCard, remaining] = dealCard(deck)
    expect(remaining).toHaveLength(51)
    expect(dealtCard).toBeDefined()
  })
})

describe('scoreHand', () => {
  test('scores numeric cards correctly', () => {
    expect(scoreHand([card('7'), card('8')])).toBe(15)
  })

  test('scores face cards as 10', () => {
    expect(scoreHand([card('K'), card('Q')])).toBe(20)
  })

  test('scores ace as 11 when it does not bust', () => {
    expect(scoreHand([card('A'), card('9')])).toBe(20)
  })

  test('scores ace as 1 when 11 would bust', () => {
    expect(scoreHand([card('A'), card('9'), card('5')])).toBe(15)
  })

  test('handles multiple aces', () => {
    expect(scoreHand([card('A'), card('A')])).toBe(12)
  })

  test('scores blackjack as 21', () => {
    expect(scoreHand([card('A'), card('K')])).toBe(21)
  })
})

describe('isSoft', () => {
  test('returns true when ace counts as 11', () => {
    expect(isSoft([card('A'), card('7')])).toBe(true)
  })

  test('returns false when ace counts as 1', () => {
    expect(isSoft([card('A'), card('9'), card('5')])).toBe(false)
  })

  test('returns false when no ace', () => {
    expect(isSoft([card('8'), card('7')])).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- __tests__/blackjack/engine.test.ts
```

Expected: FAIL — `engine` module not found.

- [ ] **Step 3: Implement deck and scoring in `features/blackjack/engine.ts`**

```typescript
import { Card, Suit, Value, TableRules, Outcome } from '../../lib/types'
import { SUITS, VALUES } from '../../lib/constants'

export function createDeck(deckCount: number): Card[] {
  const deck: Card[] = []
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({ suit, value })
      }
    }
  }
  return shuffle(deck)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function dealCard(deck: Card[]): [Card, Card[]] {
  const [top, ...rest] = deck
  return [top, rest]
}

function cardNumericValue(value: Value): number {
  if (value === 'A') return 11
  if (['J', 'Q', 'K'].includes(value)) return 10
  return parseInt(value, 10)
}

export function scoreHand(hand: Card[]): number {
  let total = 0
  let aces = 0
  for (const card of hand) {
    if (card.value === 'A') {
      aces++
      total += 11
    } else {
      total += cardNumericValue(card.value)
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}

export function isSoft(hand: Card[]): boolean {
  const hasAce = hand.some(c => c.value === 'A')
  if (!hasAce) return false
  let total = 0
  let aces = 0
  for (const card of hand) {
    if (card.value === 'A') { aces++; total += 11 }
    else total += cardNumericValue(card.value)
  }
  let softAces = aces
  while (total > 21 && softAces > 0) { total -= 10; softAces-- }
  return softAces > 0
}
```

- [ ] **Step 4: Run tests and confirm pass**

```bash
npm test -- __tests__/blackjack/engine.test.ts
```

Expected: All deck/scoring tests pass.

- [ ] **Step 5: Commit**

```bash
git add features/blackjack/engine.ts __tests__/blackjack/engine.test.ts
git commit -m "feat: blackjack engine deck creation and hand scoring"
```

---

## Task 5: Blackjack engine — rule checks and hand resolution

**Files:**
- Modify: `features/blackjack/engine.ts`
- Modify: `__tests__/blackjack/engine.test.ts`

- [ ] **Step 1: Add failing tests for rule checks and resolveHand**

Append to `__tests__/blackjack/engine.test.ts`:

```typescript
import {
  canDouble,
  canSplit,
  canResplitAces,
  canSurrender,
  shouldDealerHit,
  resolveHand,
  needsReshuffle,
} from '../../features/blackjack/engine'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'
import { TableRules } from '../../lib/types'

const rules = DEFAULT_TABLE_RULES  // H17, 6 decks, 3:2, DAS, no resplit aces, late surrender

describe('canDouble', () => {
  test('true on first two cards', () => {
    expect(canDouble([card('7'), card('4')], false, rules)).toBe(true)
  })

  test('false on three cards', () => {
    expect(canDouble([card('3'), card('4'), card('4')], false, rules)).toBe(false)
  })

  test('false post-split when doubleAfterSplit is off', () => {
    const nodasRules: TableRules = { ...rules, doubleAfterSplit: false }
    expect(canDouble([card('7'), card('4')], true, nodasRules)).toBe(false)
  })
})

describe('canSplit', () => {
  test('true when both cards have same value', () => {
    expect(canSplit([card('8'), card('8')])).toBe(true)
  })

  test('true for any two 10-value cards', () => {
    expect(canSplit([card('K'), card('Q')])).toBe(true)
  })

  test('false on different values', () => {
    expect(canSplit([card('7'), card('8')])).toBe(false)
  })
})

describe('canResplitAces', () => {
  test('false when resplitAces rule is off', () => {
    expect(canResplitAces([card('A'), card('A')], rules)).toBe(false)
  })

  test('true when resplitAces rule is on', () => {
    const resplitRules: TableRules = { ...rules, resplitAces: true }
    expect(canResplitAces([card('A'), card('A')], resplitRules)).toBe(true)
  })
})

describe('canSurrender', () => {
  test('true on first two cards with late surrender', () => {
    expect(canSurrender([card('J'), card('6')], rules)).toBe(true)
  })

  test('false on three cards', () => {
    expect(canSurrender([card('5'), card('6'), card('5')], rules)).toBe(false)
  })

  test('false when surrender is none', () => {
    const noSurrender: TableRules = { ...rules, surrender: 'none' }
    expect(canSurrender([card('J'), card('6')], noSurrender)).toBe(false)
  })
})

describe('shouldDealerHit', () => {
  test('dealer hits on hard 16', () => {
    expect(shouldDealerHit([card('9'), card('7')], rules)).toBe(true)
  })

  test('dealer stands on hard 17', () => {
    expect(shouldDealerHit([card('9'), card('8')], rules)).toBe(false)
  })

  test('dealer hits on soft 17 under H17', () => {
    expect(shouldDealerHit([card('A'), card('6')], rules)).toBe(true)
  })

  test('dealer stands on soft 17 under S17', () => {
    const s17Rules: TableRules = { ...rules, dealerSoft17: 'S17' }
    expect(shouldDealerHit([card('A'), card('6')], s17Rules)).toBe(false)
  })
})

describe('resolveHand', () => {
  test('player blackjack wins 1.5x with 3:2', () => {
    const result = resolveHand([card('A'), card('K')], [card('9'), card('8')], 100, rules)
    expect(result.outcome).toBe('blackjack')
    expect(result.delta).toBe(150)
  })

  test('player blackjack wins 1.2x with 6:5', () => {
    const r: TableRules = { ...rules, payoutMode: '6:5' }
    const result = resolveHand([card('A'), card('K')], [card('9'), card('8')], 100, r)
    expect(result.outcome).toBe('blackjack')
    expect(result.delta).toBe(120)
  })

  test('player wins regular hand', () => {
    const result = resolveHand([card('K'), card('9')], [card('8'), card('9')], 50, rules)
    expect(result.outcome).toBe('win')
    expect(result.delta).toBe(50)
  })

  test('player busts', () => {
    const result = resolveHand([card('K'), card('7'), card('9')], [card('8'), card('9')], 50, rules)
    expect(result.outcome).toBe('bust')
    expect(result.delta).toBe(-50)
  })

  test('push returns 0 delta', () => {
    const result = resolveHand([card('K'), card('8')], [card('9'), card('9')], 50, rules)
    expect(result.outcome).toBe('push')
    expect(result.delta).toBe(0)
  })

  test('player loses to higher dealer', () => {
    const result = resolveHand([card('K'), card('7')], [card('9'), card('9')], 50, rules)
    expect(result.outcome).toBe('lose')
    expect(result.delta).toBe(-50)
  })
})

describe('needsReshuffle', () => {
  test('true when fewer than 25% of cards remain', () => {
    const fullDeck = createDeck(1)
    const smallDeck = fullDeck.slice(0, 10) // 10 of 52 < 25%
    expect(needsReshuffle(smallDeck, 1)).toBe(true)
  })

  test('false when more than 25% remain', () => {
    const fullDeck = createDeck(1)
    expect(needsReshuffle(fullDeck, 1)).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm failures**

```bash
npm test -- __tests__/blackjack/engine.test.ts
```

Expected: FAIL — new functions not exported.

- [ ] **Step 3: Add rule checks and resolveHand to `features/blackjack/engine.ts`**

Append to the existing file:

```typescript
export function canDouble(hand: Card[], isPostSplit: boolean, rules: TableRules): boolean {
  if (hand.length !== 2) return false
  if (isPostSplit && !rules.doubleAfterSplit) return false
  return true
}

export function canSplit(hand: Card[]): boolean {
  if (hand.length !== 2) return false
  const val = (v: Value) => (['J','Q','K','10'].includes(v) ? '10' : v)
  return val(hand[0].value) === val(hand[1].value)
}

export function canResplitAces(hand: Card[], rules: TableRules): boolean {
  return rules.resplitAces && canSplit(hand) && hand[0].value === 'A'
}

export function canSurrender(hand: Card[], rules: TableRules): boolean {
  if (rules.surrender === 'none') return false
  return hand.length === 2
}

export function shouldDealerHit(dealerHand: Card[], rules: TableRules): boolean {
  const score = scoreHand(dealerHand)
  if (score < 17) return true
  if (score === 17 && isSoft(dealerHand) && rules.dealerSoft17 === 'H17') return true
  return false
}

function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && scoreHand(hand) === 21
}

export function resolveHand(
  playerHand: Card[],
  dealerHand: Card[],
  bet: number,
  rules: TableRules
): { outcome: Outcome; delta: number } {
  const playerScore = scoreHand(playerHand)
  const dealerScore = scoreHand(dealerHand)

  if (playerScore > 21) return { outcome: 'bust', delta: -bet }

  if (isBlackjack(playerHand) && !isBlackjack(dealerHand)) {
    const multiplier = rules.payoutMode === '3:2' ? 1.5 : 1.2
    return { outcome: 'blackjack', delta: Math.floor(bet * multiplier) }
  }

  if (isBlackjack(dealerHand) && !isBlackjack(playerHand)) {
    return { outcome: 'lose', delta: -bet }
  }

  if (playerScore > dealerScore || dealerScore > 21) return { outcome: 'win', delta: bet }
  if (playerScore === dealerScore) return { outcome: 'push', delta: 0 }
  return { outcome: 'lose', delta: -bet }
}

export function needsReshuffle(deck: Card[], deckCount: number): boolean {
  return deck.length < deckCount * 52 * 0.25
}
```

- [ ] **Step 4: Run all engine tests**

```bash
npm test -- __tests__/blackjack/engine.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add features/blackjack/engine.ts __tests__/blackjack/engine.test.ts
git commit -m "feat: blackjack engine rule checks and hand resolution"
```

---

## Task 6: Basic strategy lookup

**Files:**
- Create: `features/blackjack/strategy.ts`
- Create: `__tests__/blackjack/strategy.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/blackjack/strategy.test.ts`:

```typescript
import { getOptimalAction } from '../../features/blackjack/strategy'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'
import { Card, TableRules } from '../../lib/types'

const card = (value: Card['value'], suit: Card['suit'] = '♠'): Card => ({ value, suit })
const rules = DEFAULT_TABLE_RULES

describe('getOptimalAction — pairs', () => {
  test('always splits aces', () => {
    expect(getOptimalAction([card('A'), card('A')], card('9'), rules)).toBe('split')
  })
  test('always splits 8s', () => {
    expect(getOptimalAction([card('8'), card('8')], card('6'), rules)).toBe('split')
  })
  test('never splits 10s', () => {
    expect(getOptimalAction([card('K'), card('Q')], card('6'), rules)).toBe('stand')
  })
  test('never splits 5s', () => {
    expect(getOptimalAction([card('5'), card('5')], card('6'), rules)).not.toBe('split')
  })
})

describe('getOptimalAction — hard totals', () => {
  test('stands on hard 17+', () => {
    expect(getOptimalAction([card('K'), card('7')], card('9'), rules)).toBe('stand')
  })
  test('hits on hard 12 vs dealer 2', () => {
    expect(getOptimalAction([card('7'), card('5')], card('2'), rules)).toBe('hit')
  })
  test('stands on hard 13 vs dealer 6', () => {
    expect(getOptimalAction([card('7'), card('6')], card('6'), rules)).toBe('stand')
  })
  test('doubles hard 11 vs dealer 6', () => {
    expect(getOptimalAction([card('7'), card('4')], card('6'), rules)).toBe('double')
  })
  test('doubles hard 10 vs dealer 9', () => {
    expect(getOptimalAction([card('6'), card('4')], card('9'), rules)).toBe('double')
  })
  test('hits hard 10 vs dealer 10', () => {
    expect(getOptimalAction([card('6'), card('4')], card('K'), rules)).toBe('hit')
  })
})

describe('getOptimalAction — soft totals', () => {
  test('stands on soft 19 (A-8)', () => {
    expect(getOptimalAction([card('A'), card('8')], card('6'), rules)).toBe('stand')
  })
  test('doubles soft 18 (A-7) vs dealer 3', () => {
    expect(getOptimalAction([card('A'), card('7')], card('3'), rules)).toBe('double')
  })
  test('hits soft 18 (A-7) vs dealer 9', () => {
    expect(getOptimalAction([card('A'), card('7')], card('9'), rules)).toBe('hit')
  })
  test('hits soft 13 (A-2) vs dealer 4', () => {
    expect(getOptimalAction([card('A'), card('2')], card('4'), rules)).toBe('hit')
  })
})

describe('getOptimalAction — surrender', () => {
  test('surrenders 16 vs dealer 10 with late surrender', () => {
    expect(getOptimalAction([card('9'), card('7')], card('K'), rules)).toBe('surrender')
  })
  test('does not surrender when surrender is none', () => {
    const noSurrender: TableRules = { ...rules, surrender: 'none' }
    expect(getOptimalAction([card('9'), card('7')], card('K'), noSurrender)).not.toBe('surrender')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- __tests__/blackjack/strategy.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `features/blackjack/strategy.ts`**

```typescript
import { Card, Action, TableRules } from '../../lib/types'
import { scoreHand, isSoft, canSplit } from './engine'

type DealerKey = 2|3|4|5|6|7|8|9|10|11  // 11 = Ace

function dealerKey(upcard: Card): DealerKey {
  const v = upcard.value
  if (v === 'A') return 11
  if (['J','Q','K'].includes(v)) return 10
  return parseInt(v, 10) as DealerKey
}

function cardTenValue(v: Card['value']): boolean {
  return ['10','J','Q','K'].includes(v)
}

// Surrender: 16 vs 9/10/A, 15 vs 10
function getSurrenderAction(score: number, dk: DealerKey, rules: TableRules): Action | null {
  if (rules.surrender === 'none') return null
  if (score === 16 && (dk === 9 || dk === 10 || dk === 11)) return 'surrender'
  if (score === 15 && dk === 10) return 'surrender'
  return null
}

// Pairs split table
function getSplitAction(hand: Card[], dk: DealerKey, rules: TableRules): Action | null {
  if (!canSplit(hand)) return null
  const v = hand[0].value
  if (v === 'A') return 'split'
  if (v === '8') return 'split'
  if (cardTenValue(hand[0].value)) return null  // never split 10s
  if (v === '9') return (dk >= 2 && dk <= 6) || dk === 8 || dk === 9 ? 'split' : null
  if (v === '7') return dk >= 2 && dk <= 7 ? 'split' : null
  if (v === '6') return dk >= 2 && dk <= 6 ? 'split' : null
  if (v === '5') return null  // treat as hard 10
  if (v === '4') return dk === 5 || dk === 6 ? 'split' : null
  if (v === '3' || v === '2') return dk >= 2 && dk <= 7 ? 'split' : null
  return null
}

// Soft totals (hand with Ace counted as 11)
function getSoftAction(score: number, dk: DealerKey): Action {
  // score is 13–18 (A-2 through A-7); 19+ always stand
  if (score >= 19) return 'stand'
  if (score === 18) {
    if (dk >= 2 && dk <= 6) return 'double'
    if (dk === 7 || dk === 8) return 'stand'
    return 'hit'
  }
  if (score === 17) return dk >= 3 && dk <= 6 ? 'double' : 'hit'
  if (score === 16 || score === 15) return dk >= 4 && dk <= 6 ? 'double' : 'hit'
  if (score === 14 || score === 13) return dk >= 5 && dk <= 6 ? 'double' : 'hit'
  return 'hit'
}

// Hard totals
function getHardAction(score: number, dk: DealerKey): Action {
  if (score >= 17) return 'stand'
  if (score >= 13) return dk >= 2 && dk <= 6 ? 'stand' : 'hit'
  if (score === 12) return dk >= 4 && dk <= 6 ? 'stand' : 'hit'
  if (score === 11) return dk <= 10 ? 'double' : 'hit'
  if (score === 10) return dk >= 2 && dk <= 9 ? 'double' : 'hit'
  if (score === 9) return dk >= 3 && dk <= 6 ? 'double' : 'hit'
  return 'hit'
}

export function getOptimalAction(
  playerHand: Card[],
  dealerUpcard: Card,
  rules: TableRules
): Action {
  const dk = dealerKey(dealerUpcard)
  const score = scoreHand(playerHand)
  const soft = isSoft(playerHand)

  const surrender = getSurrenderAction(score, dk, rules)
  if (surrender) return surrender

  const split = getSplitAction(playerHand, dk, rules)
  if (split) return split

  if (soft) return getSoftAction(score, dk)
  return getHardAction(score, dk)
}
```

- [ ] **Step 4: Run strategy tests**

```bash
npm test -- __tests__/blackjack/strategy.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add features/blackjack/strategy.ts __tests__/blackjack/strategy.test.ts
git commit -m "feat: blackjack basic strategy lookup table"
```

---

## Task 7: Blackjack store

**Files:**
- Create: `features/blackjack/store.ts`
- Create: `__tests__/blackjack/store.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/blackjack/store.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react-native'
import { useBlackjackStore } from '../../features/blackjack/store'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'

beforeEach(() => {
  useBlackjackStore.setState(useBlackjackStore.getInitialState())
})

test('initial phase is betting', () => {
  const { result } = renderHook(() => useBlackjackStore())
  expect(result.current.phase).toBe('betting')
})

test('placeBet adds to current bet', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => result.current.placeBet(25))
  expect(result.current.bet).toBe(25)
  act(() => result.current.placeBet(15))
  expect(result.current.bet).toBe(40)
})

test('clearBet resets bet to 0', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => result.current.placeBet(50))
  act(() => result.current.clearBet())
  expect(result.current.bet).toBe(0)
})

test('deal transitions to playing phase', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => {
    result.current.setTableRules(DEFAULT_TABLE_RULES)
    result.current.placeBet(15)
    result.current.deal()
  })
  expect(result.current.phase).toBe('playing')
})

test('deal gives player 2 cards and dealer 2 cards', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => {
    result.current.setTableRules(DEFAULT_TABLE_RULES)
    result.current.placeBet(15)
    result.current.deal()
  })
  expect(result.current.playerHands[0]).toHaveLength(2)
  expect(result.current.dealerHand).toHaveLength(2)
})

test('toggleAssist flips assistEnabled', () => {
  const { result } = renderHook(() => useBlackjackStore())
  expect(result.current.assistEnabled).toBe(false)
  act(() => result.current.toggleAssist())
  expect(result.current.assistEnabled).toBe(true)
})

test('newHand resets hands and bet but keeps tableRules', () => {
  const { result } = renderHook(() => useBlackjackStore())
  act(() => {
    result.current.setTableRules(DEFAULT_TABLE_RULES)
    result.current.placeBet(25)
    result.current.deal()
    result.current.newHand()
  })
  expect(result.current.bet).toBe(0)
  expect(result.current.phase).toBe('betting')
  expect(result.current.tableRules).toEqual(DEFAULT_TABLE_RULES)
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- __tests__/blackjack/store.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `features/blackjack/store.ts`**

```typescript
import { create } from 'zustand'
import { Card, Action, Outcome, Phase, TableRules } from '../../lib/types'
import { DEFAULT_TABLE_RULES } from '../../lib/constants'
import { createDeck, dealCard, needsReshuffle, resolveHand } from './engine'
import { getOptimalAction } from './strategy'
import { useProfileStore } from '../profile/store'

type BlackjackState = {
  deck: Card[]
  playerHands: Card[][]
  activeHandIndex: number
  dealerHand: Card[]
  bet: number
  tableRules: TableRules
  phase: Phase
  assistEnabled: boolean
  suggestedAction: Action | null
  lastOutcome: Outcome | null
  lastDelta: number
}

type BlackjackActions = {
  setTableRules: (rules: TableRules) => void
  toggleAssist: () => void
  placeBet: (amount: number) => void
  clearBet: () => void
  deal: () => void
  hit: () => void
  stand: () => void
  doubleDown: () => void
  split: () => void
  surrender: () => void
  newHand: () => void
  getInitialState: () => BlackjackState
}

const initialState: BlackjackState = {
  deck: [],
  playerHands: [[]],
  activeHandIndex: 0,
  dealerHand: [],
  bet: 0,
  tableRules: DEFAULT_TABLE_RULES,
  phase: 'betting',
  assistEnabled: false,
  suggestedAction: null,
  lastOutcome: null,
  lastDelta: 0,
}

function computeSuggestion(
  playerHands: Card[][],
  activeHandIndex: number,
  dealerHand: Card[],
  assistEnabled: boolean,
  tableRules: TableRules
): Action | null {
  if (!assistEnabled) return null
  const hand = playerHands[activeHandIndex]
  const upcard = dealerHand[0]
  if (!hand || hand.length < 2 || !upcard) return null
  return getOptimalAction(hand, upcard, tableRules)
}

export const useBlackjackStore = create<BlackjackState & BlackjackActions>((set, get) => ({
  ...initialState,

  getInitialState: () => initialState,

  setTableRules: (rules) => {
    const deck = createDeck(rules.deckCount)
    set({ tableRules: rules, deck })
  },

  toggleAssist: () => {
    const { assistEnabled, playerHands, activeHandIndex, dealerHand, tableRules } = get()
    const newAssist = !assistEnabled
    const suggestedAction = newAssist
      ? computeSuggestion(playerHands, activeHandIndex, dealerHand, true, tableRules)
      : null
    set({ assistEnabled: newAssist, suggestedAction })
  },

  placeBet: (amount) => set(s => ({ bet: s.bet + amount })),
  clearBet: () => set({ bet: 0 }),

  deal: () => {
    let { deck, tableRules } = get()
    if (needsReshuffle(deck, tableRules.deckCount)) deck = createDeck(tableRules.deckCount)

    let card1: Card, card2: Card, card3: Card, card4: Card
    ;[card1, deck] = dealCard(deck)
    ;[card2, deck] = dealCard(deck)
    ;[card3, deck] = dealCard(deck)
    ;[card4, deck] = dealCard(deck)

    const playerHands = [[card1, card3]]
    const dealerHand = [card2, { ...card4, faceDown: true }]
    const { assistEnabled, bet } = get()
    const suggestedAction = computeSuggestion(playerHands, 0, dealerHand, assistEnabled, tableRules)

    set({ deck, playerHands, dealerHand, activeHandIndex: 0, phase: 'playing', suggestedAction })
  },

  hit: () => {
    let { deck, playerHands, activeHandIndex, tableRules, assistEnabled } = get()
    let card: Card
    ;[card, deck] = dealCard(deck)
    const newHands = playerHands.map((h, i) => i === activeHandIndex ? [...h, card] : h)
    const suggestedAction = computeSuggestion(newHands, activeHandIndex, get().dealerHand, assistEnabled, tableRules)
    set({ deck, playerHands: newHands, suggestedAction })
  },

  stand: () => {
    const { playerHands, activeHandIndex } = get()
    if (activeHandIndex < playerHands.length - 1) {
      set(s => ({ activeHandIndex: s.activeHandIndex + 1 }))
      return
    }
    get()._runDealer()
  },

  doubleDown: () => {
    let { deck, playerHands, activeHandIndex } = get()
    let card: Card
    ;[card, deck] = dealCard(deck)
    const newHands = playerHands.map((h, i) => i === activeHandIndex ? [...h, card] : h)
    set({ deck, playerHands: newHands, bet: get().bet * 2 })
    get()._runDealer()
  },

  split: () => {
    let { deck, playerHands, activeHandIndex } = get()
    const hand = playerHands[activeHandIndex]
    let c1: Card, c2: Card
    ;[c1, deck] = dealCard(deck)
    ;[c2, deck] = dealCard(deck)
    const hand1 = [hand[0], c1]
    const hand2 = [hand[1], c2]
    const newHands = [
      ...playerHands.slice(0, activeHandIndex),
      hand1,
      hand2,
      ...playerHands.slice(activeHandIndex + 1),
    ]
    set({ deck, playerHands: newHands })
  },

  surrender: () => {
    const { bet } = get()
    const delta = -(bet / 2)
    useProfileStore.getState().updateBalance(delta)
    set({ phase: 'result', lastOutcome: 'lose', lastDelta: delta })
  },

  newHand: () => {
    const { tableRules } = get()
    set({ ...initialState, tableRules, deck: get().deck })
  },

  // internal — not exposed in type but used by stand/doubleDown
  _runDealer: () => {
    let { deck, dealerHand, playerHands, bet, tableRules } = get()
    // Flip hole card
    dealerHand = dealerHand.map(c => ({ ...c, faceDown: false }))
    set({ phase: 'dealer', dealerHand })

    const { shouldDealerHit } = require('./engine')
    while (shouldDealerHit(dealerHand, tableRules)) {
      let card: Card
      ;[card, deck] = dealCard(deck)
      dealerHand = [...dealerHand, card]
    }

    let totalDelta = 0
    let lastOutcome: Outcome = 'lose'
    for (const hand of playerHands) {
      const { outcome, delta } = resolveHand(hand, dealerHand, bet, tableRules)
      totalDelta += delta
      lastOutcome = outcome
    }

    useProfileStore.getState().updateBalance(totalDelta)
    set({ deck, dealerHand, phase: 'result', lastOutcome, lastDelta: totalDelta })
  },
} as BlackjackState & BlackjackActions & { _runDealer: () => void }))
```

- [ ] **Step 4: Run tests**

```bash
npm test -- __tests__/blackjack/store.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add features/blackjack/store.ts __tests__/blackjack/store.test.ts
git commit -m "feat: blackjack Zustand store with deal/hit/stand/split/surrender"
```

---

## Task 8: Root layout and tab navigation

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create `app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="blackjack/index" options={{ headerShown: false }} />
    </Stack>
  )
}
```

- [ ] **Step 2: Create `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#FFD700' }}>
      <Tabs.Screen name="index" options={{ title: 'Games' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx app/\(tabs\)/_layout.tsx
git commit -m "feat: root layout and tab navigation"
```

---

## Task 9: Profile components and screen

**Files:**
- Create: `features/profile/components/ProfileCard.tsx`
- Create: `features/profile/components/CreateProfileModal.tsx`
- Create: `features/profile/components/ProfileList.tsx`
- Create: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Create `features/profile/components/ProfileCard.tsx`**

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Profile } from '../types'

type Props = {
  profile: Profile
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export function ProfileCard({ profile, isActive, onSelect, onDelete }: Props) {
  const balance = profile.bankrollMode === 'infinite' ? '∞' : `$${profile.balance}`
  return (
    <TouchableOpacity style={[styles.card, isActive && styles.active]} onPress={onSelect}>
      <View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.balance}>{balance}</Text>
      </View>
      <TouchableOpacity onPress={onDelete}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, marginVertical: 6, borderRadius: 10, backgroundColor: '#1e1e2e', borderWidth: 2, borderColor: 'transparent' },
  active: { borderColor: '#FFD700' },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  balance: { color: '#aaa', fontSize: 14, marginTop: 2 },
  delete: { color: '#ff5555', fontSize: 18, paddingHorizontal: 8 },
})
```

- [ ] **Step 2: Create `features/profile/components/CreateProfileModal.tsx`**

```tsx
import { useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native'
import { useProfileStore } from '../store'

type Props = { visible: boolean; onClose: () => void }

export function CreateProfileModal({ visible, onClose }: Props) {
  const addProfile = useProfileStore(s => s.addProfile)
  const [name, setName] = useState('')
  const [chips, setChips] = useState('1000')
  const [infinite, setInfinite] = useState(false)

  function handleCreate() {
    if (!name.trim()) return
    addProfile(name.trim(), parseInt(chips) || 1000, infinite ? 'infinite' : 'finite')
    setName(''); setChips('1000'); setInfinite(false)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>New Profile</Text>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#666"
            value={name} onChangeText={setName} />
          {!infinite && (
            <TextInput style={styles.input} placeholder="Starting chips" placeholderTextColor="#666"
              keyboardType="numeric" value={chips} onChangeText={setChips} />
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Infinite bankroll</Text>
            <Switch value={infinite} onValueChange={setInfinite} trackColor={{ true: '#FFD700' }} />
          </View>
          <TouchableOpacity style={styles.btn} onPress={handleCreate}>
            <Text style={styles.btnText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#1e1e2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: '#2a2a3e', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { color: '#fff', fontSize: 16 },
  btn: { backgroundColor: '#FFD700', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  btnText: { fontWeight: '700', fontSize: 16 },
  cancel: { color: '#aaa', textAlign: 'center', padding: 8 },
})
```

- [ ] **Step 3: Create `features/profile/components/ProfileList.tsx`**

```tsx
import { FlatList } from 'react-native'
import { Profile } from '../types'
import { ProfileCard } from './ProfileCard'

type Props = {
  profiles: Profile[]
  activeProfileId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function ProfileList({ profiles, activeProfileId, onSelect, onDelete }: Props) {
  return (
    <FlatList
      data={profiles}
      keyExtractor={p => p.id}
      renderItem={({ item }) => (
        <ProfileCard
          profile={item}
          isActive={item.id === activeProfileId}
          onSelect={() => onSelect(item.id)}
          onDelete={() => onDelete(item.id)}
        />
      )}
    />
  )
}
```

- [ ] **Step 4: Create `app/(tabs)/profile.tsx`**

```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { useProfileStore } from '../../features/profile/store'
import { ProfileList } from '../../features/profile/components/ProfileList'
import { CreateProfileModal } from '../../features/profile/components/CreateProfileModal'

export default function ProfileScreen() {
  const { profiles, activeProfileId, setActiveProfile, deleteProfile } = useProfileStore()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Profiles</Text>
      <ProfileList
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelect={setActiveProfile}
        onDelete={deleteProfile}
      />
      <TouchableOpacity style={styles.btn} onPress={() => setShowCreate(true)}>
        <Text style={styles.btnText}>+ New Profile</Text>
      </TouchableOpacity>
      <CreateProfileModal visible={showCreate} onClose={() => setShowCreate(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f', padding: 16 },
  heading: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 16 },
  btn: { backgroundColor: '#FFD700', borderRadius: 8, padding: 14, alignItems: 'center', margin: 16 },
  btnText: { fontWeight: '700', fontSize: 16 },
})
```

- [ ] **Step 5: Commit**

```bash
git add features/profile/components/ app/\(tabs\)/profile.tsx
git commit -m "feat: profile components and profile screen"
```

---

## Task 10: Lobby screen

**Files:**
- Create: `app/(tabs)/index.tsx`

- [ ] **Step 1: Create `app/(tabs)/index.tsx`**

```tsx
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfileStore } from '../../features/profile/store'

const GAMES = [
  { id: 'blackjack', label: 'Blackjack', available: true, route: '/blackjack' },
  { id: 'roulette', label: 'Roulette', available: false },
  { id: 'poker', label: 'Three Card Poker', available: false },
]

export default function LobbyScreen() {
  const router = useRouter()
  const { profiles, activeProfileId } = useProfileStore()
  const active = profiles.find(p => p.id === activeProfileId)
  const balance = active
    ? active.bankrollMode === 'infinite' ? '∞' : `$${active.balance}`
    : '—'

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.profileName}>{active?.name ?? 'No profile'}</Text>
        <Text style={styles.balance}>{balance}</Text>
      </View>
      <FlatList
        data={GAMES}
        keyExtractor={g => g.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.gameCard, !item.available && styles.disabled]}
            disabled={!item.available}
            onPress={() => item.available && item.route && router.push(item.route as any)}
          >
            <Text style={styles.gameLabel}>{item.label}</Text>
            {!item.available && <Text style={styles.soon}>Coming Soon</Text>}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  profileName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  balance: { color: '#FFD700', fontSize: 16, fontWeight: '700' },
  grid: { padding: 12 },
  gameCard: { flex: 1, margin: 8, aspectRatio: 1, backgroundColor: '#1e1e2e',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.4 },
  gameLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
  soon: { color: '#aaa', fontSize: 11, marginTop: 4 },
})
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: game lobby screen with active profile header"
```

---

## Task 11: TableSetup screen

**Files:**
- Create: `features/blackjack/components/TableSetup.tsx`

- [ ] **Step 1: Create `features/blackjack/components/TableSetup.tsx`**

```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native'
import { TableRules, PayoutMode, SoftSeven, SurrenderMode, DeckCount } from '../../../lib/types'
import { DEFAULT_TABLE_RULES } from '../../../lib/constants'

type Props = { onStart: (rules: TableRules) => void }

type SegmentedProps<T extends string | number | boolean> = {
  label: string
  note: string
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}

function RuleRow<T extends string | number | boolean>({ label, note, options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleInfo}>
        <Text style={styles.ruleLabel}>{label}</Text>
        <Text style={styles.ruleNote}>{note}</Text>
      </View>
      <View style={styles.segments}>
        {options.map(opt => (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.segment, value === opt.value && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.segmentText, value === opt.value && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export function TableSetup({ onStart }: Props) {
  const [rules, setRules] = useState<TableRules>(DEFAULT_TABLE_RULES)
  const set = <K extends keyof TableRules>(key: K, val: TableRules[K]) =>
    setRules(r => ({ ...r, [key]: val }))

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Table Rules</Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        <RuleRow<PayoutMode>
          label="Blackjack Pays" note="6:5 adds +1.39% house edge"
          options={[{ label: '3:2', value: '3:2' }, { label: '6:5', value: '6:5' }]}
          value={rules.payoutMode} onChange={v => set('payoutMode', v)}
        />
        <RuleRow<SoftSeven>
          label="Dealer Soft 17" note="H17 adds +0.22% house edge"
          options={[{ label: 'Hit (H17)', value: 'H17' }, { label: 'Stand (S17)', value: 'S17' }]}
          value={rules.dealerSoft17} onChange={v => set('dealerSoft17', v)}
        />
        <RuleRow<boolean>
          label="Double After Split" note="Off adds +0.14% house edge"
          options={[{ label: 'On', value: true }, { label: 'Off', value: false }]}
          value={rules.doubleAfterSplit} onChange={v => set('doubleAfterSplit', v)}
        />
        <RuleRow<boolean>
          label="Re-split Aces" note="On removes −0.08% house edge"
          options={[{ label: 'On', value: true }, { label: 'Off', value: false }]}
          value={rules.resplitAces} onChange={v => set('resplitAces', v)}
        />
        <RuleRow<SurrenderMode>
          label="Surrender" note="Late surrender removes −0.08%"
          options={[{ label: 'None', value: 'none' }, { label: 'Late', value: 'late' }, { label: 'Early', value: 'early' }]}
          value={rules.surrender} onChange={v => set('surrender', v)}
        />
        <RuleRow<DeckCount>
          label="Number of Decks" note="Fewer decks favor the player"
          options={[{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '6', value: 6 }, { label: '8', value: 8 }]}
          value={rules.deckCount} onChange={v => set('deckCount', v)}
        />
      </ScrollView>
      <TouchableOpacity style={styles.playBtn} onPress={() => onStart(rules)}>
        <Text style={styles.playBtnText}>Play</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', padding: 16 },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  ruleRow: { marginBottom: 20 },
  ruleInfo: { marginBottom: 8 },
  ruleLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ruleNote: { color: '#888', fontSize: 12, marginTop: 2 },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2a2a3e', alignItems: 'center' },
  segmentActive: { backgroundColor: '#FFD700' },
  segmentText: { color: '#aaa', fontWeight: '600' },
  segmentTextActive: { color: '#000' },
  playBtn: { backgroundColor: '#FFD700', margin: 16, padding: 16, borderRadius: 10, alignItems: 'center' },
  playBtnText: { fontWeight: '700', fontSize: 18 },
})
```

- [ ] **Step 2: Commit**

```bash
git add features/blackjack/components/TableSetup.tsx
git commit -m "feat: table rules setup screen"
```

---

## Task 12: Card and Hand components

**Files:**
- Create: `features/blackjack/components/Card.tsx`
- Create: `features/blackjack/components/Hand.tsx`

- [ ] **Step 1: Create `features/blackjack/components/Card.tsx`**

```tsx
import { View, Text, StyleSheet } from 'react-native'
import { Card as CardType } from '../../../lib/types'
import { RED_SUITS } from '../../../lib/constants'

type Props = { card: CardType }

export function Card({ card }: Props) {
  if (card.faceDown) {
    return <View style={[styles.card, styles.faceDown]}><Text style={styles.back}>🂠</Text></View>
  }
  const isRed = RED_SUITS.includes(card.suit)
  return (
    <View style={styles.card}>
      <Text style={[styles.value, isRed && styles.red]}>{card.value}</Text>
      <Text style={[styles.suit, isRed && styles.red]}>{card.suit}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { width: 52, height: 76, backgroundColor: '#fff', borderRadius: 6, margin: 4,
    justifyContent: 'center', alignItems: 'center', elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  faceDown: { backgroundColor: '#1a3a5c' },
  value: { fontSize: 18, fontWeight: '700', color: '#111' },
  suit: { fontSize: 14, color: '#111' },
  red: { color: '#cc0000' },
  back: { fontSize: 36, color: '#fff' },
})
```

- [ ] **Step 2: Create `features/blackjack/components/Hand.tsx`**

```tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Card as CardType } from '../../../lib/types'
import { Card } from './Card'
import { scoreHand } from '../engine'

type Props = { hand: CardType[]; label: string; hideScore?: boolean }

export function Hand({ hand, label, hideScore }: Props) {
  const score = hand.some(c => c.faceDown) ? '?' : scoreHand(hand)
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
        {hand.map((card, i) => <Card key={i} card={card} />)}
      </ScrollView>
      {!hideScore && <Text style={styles.score}>Score: {score}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 8 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  cards: { flexDirection: 'row', paddingHorizontal: 8 },
  score: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 6 },
})
```

- [ ] **Step 3: Commit**

```bash
git add features/blackjack/components/Card.tsx features/blackjack/components/Hand.tsx
git commit -m "feat: Card and Hand display components"
```

---

## Task 13: ActionButtons and BetControls

**Files:**
- Create: `features/blackjack/components/ActionButtons.tsx`
- Create: `features/blackjack/components/BetControls.tsx`

- [ ] **Step 1: Create `features/blackjack/components/ActionButtons.tsx`**

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Action } from '../../../lib/types'

type Props = {
  suggestedAction: Action | null
  canDouble: boolean
  canSplit: boolean
  canSurrender: boolean
  onHit: () => void
  onStand: () => void
  onDouble: () => void
  onSplit: () => void
  onSurrender: () => void
}

const ACTIONS: { key: Action; label: string }[] = [
  { key: 'hit', label: 'Hit' },
  { key: 'stand', label: 'Stand' },
  { key: 'double', label: 'Double' },
  { key: 'split', label: 'Split' },
  { key: 'surrender', label: 'Surrender' },
]

export function ActionButtons({
  suggestedAction, canDouble, canSplit, canSurrender,
  onHit, onStand, onDouble, onSplit, onSurrender,
}: Props) {
  const handlers: Record<Action, () => void> = {
    hit: onHit, stand: onStand, double: onDouble, split: onSplit, surrender: onSurrender,
  }
  const enabled: Record<Action, boolean> = {
    hit: true, stand: true, double: canDouble, split: canSplit, surrender: canSurrender,
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {ACTIONS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.btn, !enabled[key] && styles.btnDisabled, suggestedAction === key && styles.btnSuggested]}
            disabled={!enabled[key]}
            onPress={handlers[key]}
          >
            <Text style={[styles.btnText, !enabled[key] && styles.btnTextDisabled]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  btn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#2a2a3e',
    borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  btnSuggested: { borderColor: '#FFD700' },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnTextDisabled: { color: '#666' },
})
```

- [ ] **Step 2: Create `features/blackjack/components/BetControls.tsx`**

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CHIP_DENOMINATIONS, TABLE_MINIMUM } from '../../../lib/constants'

type Props = {
  bet: number
  balance: number
  isInfinite: boolean
  onPlaceBet: (amount: number) => void
  onClearBet: () => void
  onDeal: () => void
}

export function BetControls({ bet, balance, isInfinite, onPlaceBet, onClearBet, onDeal }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {CHIP_DENOMINATIONS.map(denom => {
          const disabled = !isInfinite && balance < denom
          return (
            <TouchableOpacity
              key={denom}
              style={[styles.chip, disabled && styles.chipDisabled]}
              disabled={disabled}
              onPress={() => onPlaceBet(denom)}
            >
              <Text style={styles.chipText}>${denom}</Text>
            </TouchableOpacity>
          )
        })}
        <TouchableOpacity style={styles.clear} onPress={onClearBet}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.betRow}>
        <Text style={styles.betLabel}>Bet: <Text style={styles.betAmount}>${bet}</Text></Text>
        <TouchableOpacity
          style={[styles.deal, bet < TABLE_MINIMUM && styles.dealDisabled]}
          disabled={bet < TABLE_MINIMUM}
          onPress={onDeal}
        >
          <Text style={styles.dealText}>Deal</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 12, backgroundColor: '#1e1e2e', borderRadius: 12, margin: 8 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { flex: 1, paddingVertical: 12, backgroundColor: '#FFD700', borderRadius: 8, alignItems: 'center' },
  chipDisabled: { opacity: 0.3 },
  chipText: { fontWeight: '700', fontSize: 15, color: '#000' },
  clear: { flex: 1, paddingVertical: 12, backgroundColor: '#3a3a4e', borderRadius: 8, alignItems: 'center' },
  clearText: { color: '#aaa', fontWeight: '600' },
  betRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  betLabel: { color: '#aaa', fontSize: 15 },
  betAmount: { color: '#fff', fontWeight: '700' },
  deal: { backgroundColor: '#22c55e', paddingVertical: 10, paddingHorizontal: 28, borderRadius: 8 },
  dealDisabled: { opacity: 0.3 },
  dealText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
```

- [ ] **Step 3: Commit**

```bash
git add features/blackjack/components/ActionButtons.tsx features/blackjack/components/BetControls.tsx
git commit -m "feat: ActionButtons and BetControls components"
```

---

## Task 14: Blackjack table screen

**Files:**
- Create: `app/blackjack/index.tsx`

- [ ] **Step 1: Create `app/blackjack/index.tsx`**

```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { useBlackjackStore } from '../../features/blackjack/store'
import { useProfileStore } from '../../features/profile/store'
import { TableSetup } from '../../features/blackjack/components/TableSetup'
import { Hand } from '../../features/blackjack/components/Hand'
import { ActionButtons } from '../../features/blackjack/components/ActionButtons'
import { BetControls } from '../../features/blackjack/components/BetControls'
import { TableRules } from '../../lib/types'
import { canDouble, canSplit, canSurrender } from '../../features/blackjack/engine'

export default function BlackjackScreen() {
  const router = useRouter()
  const [setupDone, setSetupDone] = useState(false)

  const store = useBlackjackStore()
  const { profiles, activeProfileId } = useProfileStore()
  const activeProfile = profiles.find(p => p.id === activeProfileId)
  const isInfinite = activeProfile?.bankrollMode === 'infinite'
  const balance = activeProfile
    ? isInfinite ? Infinity : activeProfile.balance
    : 0

  function handleStart(rules: TableRules) {
    store.setTableRules(rules)
    setSetupDone(true)
  }

  if (!setupDone) return <TableSetup onStart={handleStart} />

  const activeHand = store.playerHands[store.activeHandIndex] ?? []
  const dealerUpcard = store.dealerHand[0]
  const rules = store.tableRules

  const rulePill = [
    rules.dealerSoft17,
    `${rules.deckCount}D`,
    rules.payoutMode,
    rules.surrender === 'none' ? 'No Sur' : rules.surrender === 'late' ? 'LS' : 'ES',
  ].join(' · ')

  const isPlaying = store.phase === 'playing'
  const isResult = store.phase === 'result'
  const isBetting = store.phase === 'betting'

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.pill}>{rulePill}</Text>
        <TouchableOpacity onPress={store.toggleAssist}>
          <Text style={styles.assist}>Assist: {store.assistEnabled ? '●' : '○'}</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <Hand hand={store.dealerHand} label="Dealer" hideScore={store.phase === 'playing'} />
        {store.playerHands.map((hand, i) => (
          <Hand key={i} hand={hand} label={store.playerHands.length > 1 ? `Hand ${i + 1}` : 'You'} />
        ))}
      </View>

      {/* Result banner */}
      {isResult && (
        <View style={styles.result}>
          <Text style={styles.resultText}>
            {store.lastOutcome === 'blackjack' ? '🃏 Blackjack!' :
             store.lastOutcome === 'win' ? 'You Win!' :
             store.lastOutcome === 'push' ? 'Push' :
             store.lastOutcome === 'bust' ? 'Bust' : 'Dealer Wins'}
            {'  '}
            {store.lastDelta >= 0 ? `+$${store.lastDelta}` : `-$${Math.abs(store.lastDelta)}`}
          </Text>
          <TouchableOpacity style={styles.nextBtn} onPress={store.newHand}>
            <Text style={styles.nextBtnText}>Next Hand</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action buttons (during playing phase) */}
      {isPlaying && (
        <ActionButtons
          suggestedAction={store.suggestedAction}
          canDouble={canDouble(activeHand, store.activeHandIndex > 0, rules)}
          canSplit={canSplit(activeHand)}
          canSurrender={canSurrender(activeHand, rules)}
          onHit={store.hit}
          onStand={store.stand}
          onDouble={store.doubleDown}
          onSplit={store.split}
          onSurrender={store.surrender}
        />
      )}

      {/* Bet controls (during betting phase) */}
      {isBetting && (
        <BetControls
          bet={store.bet}
          balance={isInfinite ? Infinity : (activeProfile?.balance ?? 0)}
          isInfinite={isInfinite}
          onPlaceBet={store.placeBet}
          onClearBet={store.clearBet}
          onDeal={store.deal}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Balance: {isInfinite ? '∞' : `$${activeProfile?.balance ?? 0}`}
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d5c2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, backgroundColor: '#0a4a24' },
  back: { color: '#fff', fontSize: 15 },
  pill: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  assist: { color: '#FFD700', fontSize: 15 },
  table: { flex: 1, justifyContent: 'space-around', paddingVertical: 16 },
  result: { backgroundColor: 'rgba(0,0,0,0.75)', padding: 20, margin: 12, borderRadius: 12, alignItems: 'center' },
  resultText: { color: '#FFD700', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  nextBtn: { backgroundColor: '#FFD700', paddingVertical: 10, paddingHorizontal: 32, borderRadius: 8 },
  nextBtnText: { fontWeight: '700', fontSize: 16 },
  footer: { padding: 12, backgroundColor: '#0a4a24', alignItems: 'flex-end' },
  footerText: { color: '#aaa', fontSize: 14 },
})
```

- [ ] **Step 2: Commit**

```bash
git add app/blackjack/index.tsx
git commit -m "feat: blackjack table screen — full game loop"
```

---

## Task 15: Run full test suite and smoke test

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests in `__tests__/` pass with no failures.

- [ ] **Step 2: Start the app and verify lobby loads**

```bash
npx expo start
```

Open in Expo Go or simulator. Verify:
- Lobby screen shows "No profile" in header
- Both tabs (Games, Profile) are accessible
- Blackjack card is tappable; grayed-out games are not

- [ ] **Step 3: Create a profile and play a hand**

1. Go to Profile tab → create a profile with $1,000
2. Return to Games tab — header should show name and $1,000
3. Tap Blackjack → TableSetup screen appears
4. Change a rule (e.g. 6:5) and tap Play
5. Place a $25 bet and tap Deal
6. Verify cards appear, score is correct
7. Toggle Assist — verify a gold border appears on one action button
8. Play through to result — verify balance updates in footer
9. Tap "Next Hand" — bet resets, betting phase returns

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: verify full game loop and passing test suite"
```

---

## Self-Review Against Spec

| Spec requirement | Task |
|---|---|
| Expo + TypeScript + Expo Router | Task 1 |
| Zustand + AsyncStorage persistence | Tasks 3, 7 |
| Feature-folder structure | Tasks 2–14 (all files) |
| Multiple profiles, finite + infinite bankroll | Task 3 |
| TableRules: payout, soft17, DAS, resplit, surrender, decks | Tasks 2, 5, 11 |
| Pure TS engine: deck, scoring, rule checks, resolve | Tasks 4, 5 |
| Basic strategy lookup with rule adjustments | Task 6 |
| Blackjack store: deal/hit/stand/double/split/surrender | Task 7 |
| Card + Hand components with face-down hole card | Task 12 |
| ActionButtons with gold assist highlight | Task 13 |
| BetControls: $15/$25/$50 chips, disabled when broke | Task 13 |
| TableSetup full screen with house edge notes | Task 11 |
| Rule summary pill in header | Task 14 |
| Lobby grid with Coming Soon for future games | Task 10 |
| Profile screen with create/select/delete | Task 9 |
| Result banner with delta, Next Hand button | Task 14 |
| Balance updates via `updateBalance` after each hand | Tasks 3, 7 |
