# Untitled Mobile — Blackjack App Design Spec
**Date:** 2026-05-26  
**Status:** Approved

---

## 1. Overview

A React Native mobile app for practicing and learning common casino table games. The first game is fully playable blackjack. A universal player profile system with a shared chip bankroll spans all games. An optional basic-strategy assistant highlights the optimal action on demand.

---

## 2. Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | React Native + Expo (Managed) | Fastest path, no native tooling needed |
| Language | TypeScript | Type safety across game logic and UI |
| Navigation | Expo Router | File-based routing, natural fit for multi-game lobby |
| State management | Zustand | Minimal boilerplate, easy persistence, per-feature stores |
| Persistence | AsyncStorage | Profile/bankroll data survives app restarts |
| Testing | Jest + React Native Testing Library | Unit test engine/strategy; component tests for UI |

---

## 3. Project Structure

```
app/
  (tabs)/
    index.tsx          # Game lobby home screen
    profile.tsx        # Profile switcher screen
  blackjack/
    index.tsx          # Blackjack table screen (full-screen, no tab bar)
  _layout.tsx          # Root layout, tab bar config

features/
  blackjack/
    components/
      Card.tsx         # Single playing card (suit + value)
      Hand.tsx         # Row of Cards with score label
      ActionButtons.tsx # Hit/Stand/Double/Split/Surrender with assist highlight
      BetControls.tsx  # $15/$25/$50 chip buttons + Clear + Deal
      TableSetup.tsx   # Pre-game screen: configure all TableRules before session
    store.ts           # useBlackjackStore (Zustand, session only)
    engine.ts          # Pure TS game mechanics (no React)
    strategy.ts        # Basic strategy lookup table → optimal Action

  profile/
    components/
      ProfileCard.tsx          # Displays name + balance
      ProfileList.tsx          # Scrollable list of profiles
      CreateProfileModal.tsx   # Name input + starting chips + infinite toggle
    store.ts           # useProfileStore (Zustand, persisted via AsyncStorage)
    types.ts           # Profile, BankrollMode types

lib/
  constants.ts         # Suits, values, payout ratios
  types.ts             # Shared: Card, Action, TableRules

assets/
  blackjack-basic-strategy.md  # Reference chart (already exists)
```

**Key principle:** `engine.ts` and `strategy.ts` are pure TypeScript — no React imports, no Zustand. They are called by the store and are independently unit-testable.

---

## 4. Navigation

### Tab Bar (lobby level)
| Tab | Screen | Content |
|---|---|---|
| Home | `(tabs)/index.tsx` | Game lobby grid. Active profile name + chip count in header. |
| Profile | `(tabs)/profile.tsx` | List of profiles, active profile highlighted, create new profile button. |

### Game Screens (full-screen, tab bar hidden)
- `blackjack/index.tsx` — Full table. Back arrow returns to lobby. Before the table loads, `TableSetup` modal prompts for all table rules (see §6).

### Modals
- `CreateProfileModal` — overlays the profile screen. Fields: display name, starting chip amount (numeric input), infinite bankroll toggle.

---

## 5. Profile System

### Data Model
```ts
type BankrollMode = 'finite' | 'infinite'

type Profile = {
  id: string           // uuid
  name: string
  bankrollMode: BankrollMode
  balance: number      // ignored when bankrollMode === 'infinite'
  createdAt: number    // timestamp
}
```

### `useProfileStore` (persisted)
```ts
profiles: Profile[]
activeProfileId: string | null

addProfile(name: string, startingChips: number, mode: BankrollMode): void
setActiveProfile(id: string): void
updateBalance(delta: number): void   // no-op when active profile is infinite
deleteProfile(id: string): void
```

- Persisted to AsyncStorage on every write via Zustand's `persist` middleware.
- `updateBalance` is called by the blackjack store after each hand resolves.
- Infinite bankroll profiles show "∞" in place of a chip count everywhere in the UI.

---

## 6. Table Rules

### `TableRules` Type (`lib/types.ts`)

```ts
type PayoutMode   = '3:2' | '6:5'
type SoftSeven    = 'S17' | 'H17'     // dealer stands or hits on soft 17
type SurrenderMode = 'none' | 'late' | 'early'
type DeckCount    = 1 | 2 | 6 | 8

type TableRules = {
  payoutMode: PayoutMode       // default: '3:2'
  dealerSoft17: SoftSeven      // default: 'H17' (most common in Vegas)
  doubleAfterSplit: boolean    // default: true
  resplitAces: boolean         // default: false
  surrender: SurrenderMode     // default: 'late'
  deckCount: DeckCount         // default: 6
}
```

### `TableSetup` Screen

A scrollable options screen (not a modal) before the table loads. Each rule is a labeled row with a segmented control or toggle:

| Rule | Options | House Edge Note |
|---|---|---|
| Blackjack Pays | 3:2 / 6:5 | "6:5 adds +1.39% house edge" |
| Dealer Soft 17 | Stand (S17) / Hit (H17) | "H17 adds +0.22% house edge" |
| Double After Split | On / Off | "Off adds +0.14% house edge" |
| Re-split Aces | On / Off | "On removes −0.08% house edge" |
| Surrender | None / Late / Early | "Late surrender removes −0.08%" |
| Number of Decks | 1 / 2 / 6 / 8 | "Fewer decks favor the player" |

A **"Play"** button at the bottom starts the session with the chosen rules. Rules are stored in `useBlackjackStore.tableRules` for the duration of the session.

---

## 7. Blackjack Engine (`engine.ts`)

Pure TypeScript — no side effects, no React.

```ts
createDeck(deckCount: number): Card[]         // builds + shuffles shoe
dealCard(deck: Card[]): [Card, Card[]]        // pops top card, returns [card, remainingDeck]
scoreHand(hand: Card[]): number               // best score ≤ 21; handles soft Aces
isSoft(hand: Card[]): boolean                 // true if Ace counted as 11
canDouble(hand: Card[], isPostSplit: boolean, rules: TableRules): boolean
canSplit(hand: Card[]): boolean               // both cards same value
canResplitAces(hand: Card[], rules: TableRules): boolean
canSurrender(hand: Card[], rules: TableRules): boolean
shouldDealerHit(dealerHand: Card[], rules: TableRules): boolean  // respects H17/S17
resolveHand(
  playerHand: Card[],
  dealerHand: Card[],
  bet: number,
  rules: TableRules
): { outcome: Outcome; delta: number }
// outcome: 'blackjack' | 'win' | 'lose' | 'push' | 'bust'
// delta: chip change (positive = win, negative = loss, 0 = push)
```

**Payout logic:**
- Blackjack pays 3:2 → `delta = bet * 1.5`
- Blackjack pays 6:5 → `delta = bet * 1.2`
- Regular win → `delta = bet`
- Push → `delta = 0`
- Lose/bust → `delta = -bet`

**Surrender:**
- Late surrender: player may surrender after dealer checks for blackjack (hole card peeked)
- Early surrender: player may surrender before dealer checks (rare, very player-favorable)
- `canSurrender` returns false when `rules.surrender === 'none'`

**Shoe management:** Deck is reshuffled when fewer than ~25% of cards remain.

---

## 8. Basic Strategy (`strategy.ts`)

```ts
type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender'

getOptimalAction(playerHand: Card[], dealerUpcard: Card, rules: TableRules): Action
```

Lookup priority matches the book (from `assets/blackjack-basic-strategy.md`):
1. Surrender
2. Split
3. Double
4. Hit / Stand

Implemented as nested lookup tables (hard totals, soft totals, pairs) keyed by player total/hand type and dealer upcard value. No runtime computation — pure table lookup.

**Rule-sensitive adjustments:**
- H17: soft 18 (A-7) doubles vs dealer 2 (not applicable under S17)
- `surrender === 'none'`: surrender branch is skipped entirely
- `doubleAfterSplit === false`: double option suppressed on post-split hands

---

## 9. Blackjack Store (`useBlackjackStore`)

Session-only (not persisted — resets per hand).

```ts
// State
deck: Card[]
playerHands: Card[][]     // array to support split hands
activeHandIndex: number
dealerHand: Card[]
bet: number
tableRules: TableRules    // set during TableSetup, fixed for the session
phase: Phase              // 'betting' | 'playing' | 'dealer' | 'result'
assistEnabled: boolean
suggestedAction: Action | null
lastOutcome: Outcome | null
lastDelta: number

// Actions
setTableRules(rules: TableRules): void   // called by TableSetup before session starts
toggleAssist(): void
placeBet(amount: number): void           // adds chip amount to current bet
clearBet(): void
deal(): void                             // transitions betting → playing
hit(): void
stand(): void                            // triggers dealer play when last hand stands
doubleDown(): void
split(): void
surrender(): void
newHand(): void                          // resets for next round, keeps deck + tableRules
```

After every action that changes hand state, the store calls `getOptimalAction(hand, upcard, tableRules)` and updates `suggestedAction` (only when `assistEnabled` is true).

After `stand()` resolves all hands, the store calls `resolveHand()` from engine.ts then calls `useProfileStore.updateBalance(delta)`.

---

## 10. Blackjack Table UI

### Layout (top → bottom)
```
┌─────────────────────────────────────┐
│  ← Back         H17·6D  Assist: ●  │  ← header (shows active rule summary)
├─────────────────────────────────────┤
│         [ Dealer Hand ]             │
│         Score: 17                   │
├─────────────────────────────────────┤
│         [ Player Hand ]             │
│         Score: 14                   │
├─────────────────────────────────────┤
│  [ Hit ] [ Stand ] [ Double ]       │  ← ActionButtons
│  [ Split ]  [ Surrender ]           │    gold border on suggested action
├─────────────────────────────────────┤
│  [$15] [$25] [$50] [Clear]  Bet:$50 │  ← BetControls
│              [ DEAL ]               │
├─────────────────────────────────────┤
│  Balance: $950          Infinite: ∞ │  ← footer
└─────────────────────────────────────┘
```

The header rule summary is a compact pill (e.g. "H17 · 6D · 3:2 · LS") so the player always knows what table they're at.

### Cards
- Rendered as styled `View` components (no image assets)
- Face: value + suit symbol (♠ ♥ ♦ ♣), color-coded red/black
- Dealer's hole card shown face-down (back pattern) until dealer plays

### Assist Highlight
- When `assistEnabled` is true and `suggestedAction` is set, the matching action button renders with a gold border
- No tooltip text — the highlight alone is the hint
- Toggle is in the header (always accessible mid-hand)

### Table Setup Screen
- Full screen before the table loads (not a modal)
- Scrollable list of rule rows, each with a segmented control or toggle
- Defaults reflect the most common Vegas Strip rules: H17, 6 decks, 3:2, DAS on, no re-split aces, late surrender
- House edge delta shown per option so the player understands the impact
- **[Play]** button at the bottom confirms rules and starts the session

### Bet Controls
- Chip buttons disabled when balance is less than the chip value (finite profiles)
- Deal button disabled until bet ≥ $15
- During `playing` / `dealer` / `result` phases, bet controls are hidden; action buttons are shown

### Result Display
- After hand resolves: overlay or banner showing outcome ("Blackjack! +$75", "Push", "Bust -$50")
- **[Next Hand]** button calls `newHand()` and returns to betting phase

---

## 11. Lobby (Home Screen)

- Header: active profile name + chip balance (or ∞)
- Grid of game cards:
  - **Blackjack** — active, tappable
  - Future games (e.g. Roulette, Poker) — visible but grayed out with "Coming Soon" badge
- Tapping Blackjack navigates to `blackjack/index.tsx`

---

## 12. Out of Scope (this phase)

- Backend / cloud sync — all data is local
- Sound effects or animations
- Card counting trainer mode
- Multiplayer
- Additional table games (structure supports adding them later)

---

## 13. Key Decisions & Rationale

| Decision | Rationale |
|---|---|
| Feature-folder structure | Clean boundaries from the start; each game is self-contained |
| Pure TS engine/strategy | Independently testable; no React entanglement in game logic |
| Session-only blackjack store | Hand state is ephemeral; only balance persists |
| `TableRules` passed explicitly | Engine/strategy remain pure functions; rules never leaked via global state |
| $15/$25/$50 chip denominations | Reflects common Vegas table minimums |
| Assist via button highlight | Unobtrusive; player still makes the tap, reinforcing learning |
| Vegas Strip defaults | Most recognizable starting point; deviations are clearly labeled with house edge impact |
| Rule summary pill in header | Player always knows what table they're sitting at without leaving the game |
