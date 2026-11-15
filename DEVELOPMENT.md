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

1034 tests cover the game engines, the shared chip helpers, strategy lookup, roulette and craps felt layouts, roulette wheel maths, screens, profile store and stats, and update utility.

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
    components/   # UI components (Card — sizes regular/medium/large, also used by baccarat; Hand, ActionButtons, BetControls, TableSetup)
      table/      # Screen pieces shared by every layout (TableHeader, DealerArea, HandsArea, ResultBanner, Controls, BalanceFooter)
  craps/
    engine.ts     # Pure TS: dice, phase helpers, bet validity, odds helpers, payout calc, roll resolution
    strategy.ts   # Pure TS: getBetQuality — rates any bet type as optimal/acceptable/poor/avoid
    layout.ts     # Pure TS: felt geometry per variant (areas, box stack slots, pucks, dice rect), hitCraps, slotFor
    spots.ts      # Pure TS: spotAction/stackTapAction resolve a dropped or tapped spot/stack to a store call
    store.ts      # Session Zustand store (phase, dice, point, bets, roll, assist toggle)
    components/   # UI components (TableSetup, DiceDisplay, BetCategoryPanel, BetRow, OddsRow, HopBetGrid, RollButton, RollResultBanner)
      table/      # Drawn table pieces (CrapsFelt — presentational felt: areas, chip stacks with BUY/LAY tags and odds, ON/OFF puck, Assist tints; CrapsTable — slim header with the reason line, chip tray column at the left, felt with drag/tap chips (stack first, then area; drag a removable stack off to take it down), dice + ROLL in the dice column, roll result banner)
  baccarat/
    engine.ts     # Pure TS: deck, scoring, natural/third-card rules, hand resolution
    strategy.ts   # Pure TS: bet quality ratings (player/banker/tie/side bets)
    cardFaces.ts  # Static require map: card -> assets/card-faces/<V><S>.jpg (big squeeze card art)
    reveal.ts     # Pure TS: card reveal order (P1,B1,P2,B2,P3,B3) and per-hand face-up/shown counts
    store.ts      # Session Zustand store (shoe, hands, bets, betting→revealing→result phases, deferred settlement, assist toggle)
    components/   # UI components (BetPanel, HandDisplay, ResultBanner, SqueezeCard), each taking a table size
      table/      # Screen pieces shared by every layout (TableHeader, HandsArea stack/sideBySide, RevealArea, Footer bar/panel, landscape.ts PANEL_WIDTH)
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
  screenClass.ts  # Pure: size class (compact <360dp / regular / large >=600dp, by the shorter side) + orientation
  useScreenClass.ts # Hook wrapping screenClass with useWindowDimensions
  orientation.ts  # Orientation lock owner (useOrientationLock) + rotation-request store
  tableLayout.ts  # Pure: pickLayout(sizeClass, orientation) → phone | largePortrait | largeLandscape (card games)
  tableSize.ts    # TableSize ('regular' | 'large'), LARGE_SCALE, sizedStyles()
components/
  Text.tsx        # Text/TextInput wrappers that cap font scaling at 1.3x; import these, not react-native's
  UpdateModal.tsx # In-app update prompt modal
  chips/          # Shared chip table: chips.ts (colours, sizes, drag lift), ChipFace, DragHandle (drag/tap race), ChipTray (row or column), useChipTable (origins, ghost, highlight/flash, board tap); used by roulette
assets/
  avatars/        # Bundled 256px profile pictures + default (originals in gitignored assets/profile-pictures/)
  rules-docs/     # Per-game rules references (*-rules.md, blackjack-basic-strategy.md); roulette-rules.md and craps-rules.md are the cited sources of truth for those games
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

## Screen Sizes and Orientation

`lib/screenClass.ts` sorts the window into `compact` (shorter side under 360dp, e.g. a Galaxy Fold cover screen), `regular` (360–599dp, most phones) or `large` (600dp and up, a Fold inner screen or tablet). It uses the shorter side, so rotating never changes the class. Components read it with `useScreenClass()`.

`app.json` sets `"orientation": "default"` so the native build may rotate. The root layout is the only place that locks: `useOrientationLock()` (`lib/orientation.ts`) unlocks on `large` screens and otherwise locks `PORTRAIT_UP`, re-applying on fold/unfold. A screen that should follow the phone on regular phones sets `useOrientationStore.setRotationRequested(true)` while open and `false` on unmount. Today only the roulette table does this. Android 16+ ignores orientation locks on large screens anyway. Jest gets a default `expo-screen-orientation` mock in `.jest/setup.js`.

**Roulette chip gestures.** Each tray chip races a Pan (drag; moves 2px+) against a Tap (selects the chip, `selectedChip` in the roulette store). The board area has one Tap that places the selected chip via `tapTarget()` (an existing stack under the finger first, otherwise `hitTest`). Stack handles keep only their Pan, so a tap on a stack is handled once, by the board. A drag handle re-measures its window origin at touch-down (`onBegin`) because `onLayout` misses moves of the whole tray. Gesture tests use RNGH `fireGestureHandler` with `withTestId` ids (`drag-chip-<n>`, `tap-chip-<n>`, `tap-board`) and flush microtasks/timers after each gesture.

**Font scaling:** import `Text`/`TextInput` from `components/Text.tsx`, not `react-native`. They cap the system font-size setting at 1.3× (`MAX_FONT_SCALE`). `__tests__/lib/textCap.test.tsx` fails if a file imports them from `react-native`. `Animated.Text` needs `maxFontSizeMultiplier={MAX_FONT_SCALE}` passed by hand.

### Per-game large-screen layouts

Blackjack and baccarat have their own large-screen layouts; craps should follow the same pattern:
- `lib/tableLayout.ts`: `pickLayout(sizeClass, orientation)` returns `phone`, `largePortrait` or `largeLandscape`. Phones keep one layout whatever the orientation.
- The screen is built from small pieces (`components/table/`). Each layout only arranges them: the phone order, the same order bigger with the controls in a centred `maxWidth: 520` column, or the felt plus a right-hand control panel (300dp blackjack, 340dp baccarat so its chip rows fit).
- Sizing: components take `size: 'regular' | 'large'` (default `regular`) and pick a whole style sheet from `sizedStyles(base, largeOverrides)` (`lib/tableSize.ts`). Baccarat's landscape felt uses `Card size="medium"` (68×99) so a three-card hand fits each half of the Fold's inner screen; `__tests__/baccarat/screen.test.tsx` pins that arithmetic. Don't write `size === 'large' && styles.x`: that adds `false` to style arrays and changes the phone output.
- Guard: `__tests__/<game>/screen.test.tsx` snapshots the phone screen in every phase. Never update those snapshots with `-u` as part of large-screen work, because a diff there means phones changed.

## Publishing a Release

Releases come in two forms depending on what changed.

**First-time setup:** `npm install -g eas-cli && eas login`

### JS/Asset changes (most updates) — EAS Update

No new APK or AAB needed. One command updates **both** the GitHub APKs and the Play installs:

```bash
eas update --branch master --environment production --message "describe what changed"
```

Users get the update silently on their next app launch. Takes ~1 minute.

> **Channels → branch:** both EAS channels point at the same update branch, so a single publish to `master` reaches every install:
>
> | Build | Channel (fixed at build time) | Branch |
> |---|---|---|
> | GitHub APK (`preview` profile) | `preview` | `master` |
> | Play install (`production` profile) | `production` | `master` |
>
> This is server-side config. Check it with `eas channel:list`. To send an update to only one group (for example APK users first), split them with `eas channel:edit production --branch production`, publish to that branch, and run `eas channel:edit production --branch master` when you're done.

> **`--branch` vs `--environment`:** `--branch master` controls *which installed apps receive* the update, through the channel mapping above. `--environment preview` controls *which EAS environment variables get baked into the JS bundle*. Any `EXPO_PUBLIC_*` variables stored on EAS for that environment are inlined into the bundle when you publish. Recent eas-cli versions require `--environment` when running with `--non-interactive`. Interactively, the CLI prompts you to pick one instead. This makes sure the wrong environment's values never get bundled by accident. The project currently has no EAS environment variables (check with `eas env:list --environment preview`), so the flag has no effect yet. It will start to matter once variables such as API URLs or keys are added.

> **Note:** The update is only delivered to builds (APK or AAB) whose `runtimeVersion` matches the value in `app.json` at build time. If you bumped `runtimeVersion`, users need a new build. Rebuild **both** the APK (flow below) and the Play AAB so they stay on the same runtime and keep sharing the `master` branch.

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

### Google Play internal testing — `production` profile

Testers install through the Play Store, so Play Protect doesn't flag the app as a sideload. The `production` profile builds an `.aab`, signs it with the EAS keystore (the upload key) and uses the `production` OTA channel. `versionCode` is managed remotely by EAS (`appVersionSource: "remote"`) and bumped automatically on every build.

**One-time setup:**

1. In Play Console, create the app with package `com.stbyte441.casinohelper`, then enroll in Play App Signing.
2. Fill in the required App content forms: content rating (includes simulated gambling questions), data safety (no data collected or shared), target audience and the privacy policy URL `https://st-byte441.github.io/casino-helper/privacy`. That page is `docs/privacy.md`, served by GitHub Pages from `master` → `/docs`. Edit that file and bump its effective date whenever the app starts using data differently.
3. Make sure EAS's `versionCode` starts above any build you've already shipped: `eas build:version:set --platform android`.
4. Build: `eas build --platform android --profile production`.
5. Upload this **first** `.aab` by hand: Test and release → Testing → Internal testing → Create new release. Google doesn't allow the first upload through the API.
6. Add testers (emails or a Google Group, up to 100) and send them the opt-in link.
7. For automated submits, create a Google Cloud service account with release permissions in Play Console, download its JSON key as `play-service-account.json` in the repo root (gitignored, **never commit it**).

**Each release after that:**

```bash
eas build --platform android --profile production --auto-submit
# or submit an existing build:
eas submit --platform android --profile production
```

**OTA updates for Play installs:** the `production` channel points at the `master` update branch, so the normal `eas update --branch master ...` from the EAS Update section reaches Play installs too. You don't need a separate publish.

> **Signing:** Google re-signs Play builds with its own app-signing key, so a Play install and a GitHub APK have different certificates. One can't be installed over the other: uninstall first. Because of this, `lib/updates.ts` skips the GitHub release check (and the `UpdateModal` prompt) when `Updates.channel` is `production`. Play delivers those updates itself. For Android developer verification, keep **both** fingerprints registered:
>
> - **App-signing key** (Google's, signs Play installs): `DD:0D:49:3A:BB:AA:4F:73:ED:79:3D:F5:D1:C7:8D:C7:C0:3D:AC:2B:6A:22:EE:0D:F8:40:26:95:10:2B:20:0A`, shown under Play Console → Test and release → App integrity.
> - **EAS keystore** (the Play upload key, also signs the GitHub `preview` APKs): `BE:A8:A5:01:67:63:41:25:B4:DD:B1:47:00:BB:90:5E:1A:27:07:F8:FF:AF:B4:8E:05:4B:CF:CD:A4:64:99:22`.

### Store listing assets

`store-assets/play/` holds the Play icon (`icon-512.png`, 512×512) and feature graphic (`feature-graphic-1024x500.png`). `make_graphics.py` regenerates them from `assets/chipLogo.png`. It needs Pillow and the Playfair Display and Inter variable fonts from github.com/google/fonts: `python make_graphics.py <repo> <fonts-dir> <out-dir>`. Phone screenshots aren't kept in the repo. They're uploaded directly in Play Console (Grow users → Store presence → Main store listing). Replacements must be real device captures, and the long side can be at most twice the short side, so don't use the Galaxy Fold cover screen.
