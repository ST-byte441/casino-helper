# Casino Table Games — Mobile Practice App

A React Native mobile app for practicing and learning common casino table games. Each game includes an optional **basic strategy assist** that highlights the statistically optimal action so you can study while you play.

## Download (Android)

Get the latest APK from the [Releases page](../../releases/latest).

> Tap the `.apk` file on your Android device. If prompted, allow installation from unknown sources in your device settings.

## Features

- **Multiple player profiles** — create profiles with a real bankroll or infinite chips for pure practice
- **Configurable Vegas table rules** — payout (3:2 / 6:5), dealer soft 17 (H17/S17), double after split, re-split aces, surrender mode, deck count, and continuous shuffle (CSM)
- **Basic strategy assist** — toggle a gold highlight on the optimal action button at any time
- **Chip denominations** — $15 / $25 / $50 (standard Vegas table minimums)
- **In-app update notifications** — prompted to download a newer version on launch if one is available

## Games

| Game | Status |
|---|---|
| Blackjack | Playable |
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

84 tests cover the game engine, strategy lookup, profile store, and update utility.

## Project Structure

```
app/
  (tabs)/         # Tab bar screens
    index.tsx     # Game lobby
    sandbox.tsx   # Sandbox game picker
    profile.tsx   # Profile switcher
  blackjack/
    index.tsx     # Blackjack table screen
  sandbox/
    blackjack.tsx # Blackjack strategy sandbox
features/
  blackjack/
    engine.ts     # Pure TS: deck, scoring, rule checks, hand resolution
    strategy.ts   # Pure TS: basic strategy lookup table
    store.ts      # Session Zustand store
    components/   # UI components (Card, Hand, ActionButtons, BetControls, TableSetup)
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
