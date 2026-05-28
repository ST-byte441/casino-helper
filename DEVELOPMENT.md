# Development

## Getting Started

```bash
npm install
npx expo start
npx expo start --tunnel  # for WSL users
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
