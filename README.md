# Casino Table Games — Mobile Practice App

A React Native mobile app for practicing and learning common casino table games. Each game includes an optional **basic strategy assist** that highlights the statistically optimal action so you can study while you play.

## Download (Android)

Get the latest APK from the [Releases page](../../releases/latest).

> Tap the `.apk` file on your Android device. If prompted, allow installation from unknown sources in your device settings.

## Features

- **Multiple player profiles** — create profiles with a real bankroll or infinite chips for pure practice
- **In-app update notifications** — prompted to download a newer version on launch if one is available

### Blackjack

- **Configurable table rules** — payout (3:2 / 6:5), dealer soft 17 (H17/S17), double after split, re-split aces, surrender mode, deck count, and continuous shuffle (CSM)
- **Chip denominations** — $15 / $25 / $50 (standard Vegas table minimums)
- **Basic strategy assist** — gold highlight on the statistically optimal action at any time
- **Sandbox mode** — step through any hand scenario by manually setting your cards and the dealer's up-card to study how basic strategy applies in specific situations

### Craps

- **Three variants** — Standard, Crapless (2/3/11/12 become point numbers), and Easy Craps (simplified bet menu for beginners)
- **Full bet menu** — Pass/Don't Pass, Come/Don't Come, Place, Buy, Lay, Hardways, Field, Proposition bets, and all 21 Hop combinations
- **Configurable odds** — 1x, 2x, 3-4-5x, 5x, or 10x free odds; optional 3:1 payout on Field 12
- **Place bet working toggle** — flip any Place bet ON/OFF between come-out and point phases
- **Strategy assist** — colour-coded bet quality: gold (Pass + max odds), white (acceptable), orange (poor), red (avoid)

## Games

| Game | Status |
|---|---|
| Blackjack | Playable |
| Craps | Playable |
| Roulette | Coming soon |
| Poker | Coming soon |

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Expo (Managed, SDK 56) |
| Language | TypeScript |
| Navigation | Expo Router |
| State | Zustand + AsyncStorage |
| Testing | Jest + React Native Testing Library |

## Getting Started

```bash
npm install
npx expo start
npx expo start --tunnel (for WSL users)
```

Scan the QR code with the **Expo Go** app (iOS/Android) or press `i`/`a` to open in a simulator.

## Running Tests

```bash
npx jest          # full suite
npx jest <path>   # single file
npx tsc --noEmit  # type check only
```

172 tests cover the game engine, strategy lookup, profile store, and update utility.

## Project Structure

```
app/
  (tabs)/         # Tab bar screens
    index.tsx     # Game lobby
    sandbox.tsx   # Sandbox game picker
    profile.tsx   # Profile switcher
  blackjack/
    index.tsx     # Blackjack table screen
  craps/
    index.tsx     # Craps table screen
  sandbox/
    blackjack.tsx # Blackjack strategy sandbox
features/
  blackjack/
    engine.ts     # Pure TS: deck, scoring, rule checks, hand resolution
    strategy.ts   # Pure TS: basic strategy lookup table
    store.ts      # Session Zustand store
    components/   # UI components (Card, Hand, ActionButtons, BetControls, TableSetup)
  craps/
    engine.ts     # Pure TS: dice, phase helpers, bet validity, odds helpers, payout calc, roll resolution
    strategy.ts   # Pure TS: getBetQuality — rates any bet type as optimal/acceptable/poor/avoid
    store.ts      # Session Zustand store (phase, dice, point, bets, roll, assist toggle)
    components/   # UI components (TableSetup, DiceDisplay, BetCategoryPanel, BetRow, OddsRow, HopBetGrid, RollButton, RollResultBanner)
  profile/
    store.ts      # Persisted Zustand store (AsyncStorage)
    components/   # ProfileCard, ProfileList, CreateProfileModal
lib/
  types.ts        # Shared types
  constants.ts    # Suits, values, chip denominations, default table rules
  updates.ts      # GitHub release version check utility
components/
  UpdateModal.tsx # In-app update prompt modal
__tests__/        # Mirrors the feature folder structure
```

## Adding a New Game

1. Create `features/<game>/` with `engine.ts`, `strategy.ts`, `store.ts`, and `components/`
2. Add a route at `app/<game>/index.tsx`
3. Add a tile in `app/(tabs)/index.tsx`

## Publishing a Release

Releases come in two forms depending on what changed.

**First-time setup:** `npm install -g eas-cli && eas login`

### JS/Asset changes (most updates) — EAS Update

No new APK needed. Run:

```bash
eas update --channel preview --message "describe what changed"
```

Users get the update silently on their next app launch. Takes ~1 minute.

> **Note:** The update is only delivered to APKs whose `runtimeVersion` matches the value in `app.json` at build time. If you bumped `runtimeVersion`, users need a new APK — use the Full APK rebuild flow below.

### Native changes (new permissions, new native packages) — Full APK rebuild

Required when bumping `runtimeVersion` in `app.json`.

1. Bump `"version"` and `"runtimeVersion"` in `app.json`
2. Commit the version bump
3. Build the APK:
   ```bash
   eas build --platform android --profile preview
   ```
4. Download the `.apk` from the link EAS prints when the build finishes (~10–20 min)
5. Create a GitHub release and attach the APK:
   ```bash
   gh release create v<version> ./casino-helper-*.apk \
     --title "Casino Helper v<version>" \
     --notes "Describe what changed"
   ```

Each release gets its own version tag. The Releases page always shows the latest at the top.
