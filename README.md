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

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup, project structure, adding games, and publishing releases.
