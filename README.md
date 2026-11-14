# Casino Table Games — Mobile Practice App

A React Native mobile app for practicing and learning common casino table games. Blackjack and Craps include an optional **basic strategy assist** that highlights the statistically optimal action so you can study while you play.

## Download (Android)

Get the latest APK from the [Releases page](../../releases/latest).

> Tap the `.apk` file on your Android device. If prompted, allow installation from unknown sources in your device settings.

## Features

- **Multiple player profiles** — create profiles with a real bankroll or infinite chips for pure practice
- **Profile detail & stats** — tap a profile to set a picture (20 bundled avatars or your own photo), add money, and see bankroll and per-game stats (hands, win rate, net result; craps points made, seven-outs and longest roll). Stakes are capped by your balance
- **Lobby header** — the Games tab shows the active profile's picture next to its name; tap either to open that profile's stats page
- **In-app update notifications** — prompted to download a newer version on launch if one is available

### Blackjack

- **Configurable table rules** — payout (3:2 / 6:5), dealer soft 17 (H17/S17), double after split, re-split aces, surrender mode, deck count, and continuous shuffle (CSM)
- **Chip denominations** — $15 / $25 / $50 (standard Vegas table minimums)
- **Vegas-style dealer play** — the dealer peeks for blackjack and ends the hand immediately on a natural; if you bust (or are dealt a natural), the dealer only flips the hole card instead of drawing out
- **Soft totals** — soft hands show both counts (e.g. `7/17`)
- **Basic strategy assist** — gold highlight on the statistically optimal action at any time
- **Sandbox mode** — step through any hand scenario by manually setting your cards and the dealer's up-card to study how basic strategy applies in specific situations

### Craps

- **Three variants** — Standard, Crapless (2/3/11/12 become point numbers), and Easy Craps (simplified bet menu for beginners)
- **Full bet menu** — Pass/Don't Pass, Come/Don't Come, Place, Buy, Lay, Hardways, Field, Proposition bets, and all 21 Hop combinations
- **Configurable odds** — 1x, 2x, 3-4-5x, 5x, or 10x free odds; optional 3:1 payout on Field 12
- **Place bet working toggle** — flip any Place bet ON/OFF between come-out and point phases
- **Strategy assist** — colour-coded bet quality: gold (Pass + max odds), white (acceptable), orange (poor), red (avoid)

### Baccarat

- **Standard Baccarat** — Player, Banker (5% commission), Tie (8:1), Player Pair and Banker Pair (11:1) bets
- **Chip betting** — pick a main chip ($15 / $25 / $50 / $100) for Player and Banker ($15 table minimum) and a side chip ($1 / $5 / $10 / $25) for Tie and the pairs. Side bets have a dashed purple outline
- **Fully automatic rules** — all drawing rules applied after Deal; no player decisions required
- **Card squeeze** — reveal every card in real dealing order (P1, B1, P2, B2, then third cards) by dragging up to peel it back, or turn the header **Squeeze ●/○** toggle off for a quick automatic flip. The result waits until you tap **Next Hand**
- **Sandbox mode** — manually set all four starting cards, pick third cards step-by-step, and see the rule explanation driving each draw decision

### Roulette

- **Three wheels** — Single zero (European), Double zero (American) and Triple zero, chosen on the setup screen along with Slow or Fast spins
- **Full betting layout** — straight, split, street, corner, six line, basket / first four / first five (where the wheel allows), dozens, columns and the even-money bets; $10 table minimum (inside bets combined, each outside bet)
- **Drag-and-drop chips** — drag $1 / $5 / $25 / $100 chips from the tray onto the board (the chip sits mostly above your fingertip, with 75% of it visible, so you can see where it lands, and the numbers a split/corner/street covers light up), drag a stack to move it, or off the board to remove it; a chip you cannot afford is refused with a "Not enough balance" note; Undo and Clear
- **Animated wheel** — Slow shows the ball dropping into its pocket, Fast stops the wheel quickly; the winning number stays marked on the board and winning bets stay up for the next spin
- **Follows the phone** — the roulette table rotates between portrait and landscape layouts; the rest of the app stays portrait

## Games

| Game | Status |
|---|---|
| Blackjack | Playable |
| Craps | Playable |
| Baccarat | Playable |
| Roulette | Playable |
| Poker | Coming soon |

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Expo (Managed, SDK 58) |
| Language | TypeScript |
| Navigation | Expo Router |
| State | Zustand + AsyncStorage |
| Media | expo-image-picker + expo-file-system (profile photos) |
| Graphics | react-native-svg (roulette wheel) |
| Orientation | expo-screen-orientation (portrait lock, roulette unlocks) |
| Testing | Jest + React Native Testing Library |

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup, project structure, adding games, and publishing releases.
