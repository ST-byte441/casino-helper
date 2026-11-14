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

557 tests cover the game engines, strategy lookup, roulette layout and wheel maths, screens, profile store and stats, and update utility.

## Project Structure

```
app/
  (tabs)/         # Tab bar screens
    index.tsx     # Game lobby (header: active profile avatar + name, taps through to profile stats)
    sandbox.tsx   # Sandbox game picker
    profile.tsx   # Profile switcher
  blackjack/
    index.tsx     # Blackjack table screen
  craps/
    index.tsx     # Craps table screen
  baccarat/
    index.tsx     # Baccarat table screen
  roulette/
    index.tsx     # Roulette screen: setup, then betting table / wheel / result; unlocks rotation while open
  profile/
    [id].tsx      # Profile detail (avatar, balance, Add Money, bankroll, per-game stats)
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
  baccarat/
    engine.ts     # Pure TS: deck, scoring, natural/third-card rules, hand resolution
    strategy.ts   # Pure TS: bet quality ratings (player/banker/tie/side bets)
    cardFaces.ts  # Static require map: card -> assets/card-faces/<V><S>.jpg (big squeeze card art)
    reveal.ts     # Pure TS: card reveal order (P1,B1,P2,B2,P3,B3) and per-hand face-up/shown counts
    store.ts      # Session Zustand store (shoe, hands, bets, betting→revealing→result phases, deferred settlement, assist toggle)
    components/   # UI components (BetPanel, HandDisplay, ResultBanner, SqueezeCard)
  roulette/
    engine.ts     # Pure TS: wheels, pocket order and colours, bet catalogue, validation ($10 minimum), settlement
    layout.ts     # Pure TS: board geometry for portrait/landscape, hit testing and drop resolution
    wheelMath.ts  # Pure TS: spin durations and final wheel rotation for a result pocket
    store.ts      # Session Zustand store (bets, undo history, betting→spinning→result, marker, abandon)
    components/   # UI components (RouletteSetup, Board, BettingTable, Wheel, ResultPanel)
  profile/
    store.ts      # Persisted Zustand store (AsyncStorage, persist v3) — recordHands, recordCrapsRoll, addMoney, setPicture
    migrate.ts    # Persist migration (v0 -> v1 adds stats/picture; v1 -> v2 adds craps longestRoll; v2 -> v3 adds roulette stats)
    stats.ts      # Pure TS: stats types, recording, win rate
    types.ts      # Profile and stats types
    format.ts     # Money formatting (negative shown as -$X)
    pictures.ts   # Bundled avatar map + photo copy to app storage
    components/   # ProfileCard, ProfileList, CreateProfileModal, ProfileAvatar, PicturePicker, AddMoneyModal, BankrollBox, GameStatsTabs
  preferences/
    store.ts      # Persisted Zustand store (AsyncStorage) for table rules per game, roulette wheel/speed + baccarat Squeeze/Flip mode
lib/
  types.ts        # Shared types
  constants.ts    # Suits, values, chip denominations, default table rules
  updates.ts      # GitHub release version check utility
components/
  UpdateModal.tsx # In-app update prompt modal
assets/
  avatars/        # Bundled 256px profile pictures + default (originals in gitignored assets/profile-pictures/)
  rules-docs/     # Per-game rules references (*-rules.md, blackjack-basic-strategy.md); roulette-rules.md is the cited source of truth for roulette
__tests__/        # Mirrors the feature folder structure
```

## Adding a New Game

1. Create `features/<game>/` with `engine.ts`, `strategy.ts`, `store.ts`, and `components/`
2. Add a route at `app/<game>/index.tsx` and register it in the root Stack in `app/_layout.tsx`
3. Add a tile in `app/(tabs)/index.tsx`
4. Track stats for the game in the profile:
   - Add the game to `GameId` and a new key to `ProfileStats` (`features/profile/types.ts`), and give it a zeroed record in `emptyStats()` (`features/profile/stats.ts`)
   - Add a `GAME_TABS` entry (`features/profile/components/GameStatsTabs.tsx`) so the profile detail screen shows a tab for it
   - Bump the persist `version` in `features/profile/store.ts` and extend `migrateProfileState` (`features/profile/migrate.ts`) so existing profiles get the new key filled with the empty record; cover it in `__tests__/profile/migrate.test.ts`
   - Record settled results from the game store with `useProfileStore.getState().recordHands(...)` (or a game-specific recorder), exactly once per settled hand, including when the player leaves the table mid-hand

## Screen Orientation

The app is portrait-only. `app.json` sets `"orientation": "default"` so the native build may rotate, and `app/_layout.tsx` locks portrait on mount with `expo-screen-orientation` (`lockAsync(PORTRAIT_UP)`). A screen that should follow the phone unlocks while it is open and relocks on unmount; today only the roulette table does this (`unlockAsync()` once setup is done, `lockAsync(PORTRAIT_UP)` when the screen unmounts). Jest gets a default `expo-screen-orientation` mock in `.jest/setup.js`.

## Publishing a Release

Releases come in two forms depending on what changed.

**First-time setup:** `npm install -g eas-cli && eas login`

### JS/Asset changes (most updates) — EAS Update

No new APK needed. Run:

```bash
eas update --channel preview --environment preview --message "describe what changed"
```

Users get the update silently on their next app launch. Takes ~1 minute.

> **`--channel` vs `--environment`:** `--channel preview` controls *which installed apps receive* the update (our APKs are built with `"channel": "preview"` in `eas.json`). `--environment preview` controls *which EAS environment variables get baked into the JS bundle*. Any `EXPO_PUBLIC_*` variables stored on EAS for that environment are inlined into the bundle when you publish. Recent eas-cli versions require `--environment` when running with `--non-interactive`. Interactively, the CLI prompts you to pick one instead. This makes sure the wrong environment's values never get bundled by accident. The project currently has no EAS environment variables (check with `eas env:list --environment preview`), so the flag has no effect yet. It will start to matter once variables such as API URLs or keys are added.

> **Note:** The update is only delivered to APKs whose `runtimeVersion` matches the value in `app.json` at build time. If you bumped `runtimeVersion`, users need a new APK — use the Full APK rebuild flow below.

### Native changes (new permissions, new native packages; e.g. v1.4.0 added expo-image-picker and expo-file-system, v1.5.0 added react-native-svg and expo-screen-orientation) — Full APK rebuild

Required when bumping `runtimeVersion` in `app.json`.

> **1.5.0 (roulette):** adds the native packages `react-native-svg` and `expo-screen-orientation` and changes `orientation`, so it needs the 1.5.0 APK. An OTA update cannot deliver it to 1.4.x installs.

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
