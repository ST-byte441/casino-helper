# Casino Table Games — Mobile Practice App

A React Native mobile app for practicing and learning common casino table games. Blackjack and Craps include an optional **basic strategy assist** that highlights the statistically optimal action so you can study while you play.

## Download (Android)

Get the latest APK from the [Releases page](../../releases/latest).

> Tap the `.apk` file on your Android device. If prompted, allow installation from unknown sources in your device settings.

## Features

- **Multiple player profiles** — create profiles with a real bankroll or infinite chips for pure practice
- **Profile detail & stats** — tap a profile to set a picture (20 bundled avatars or your own photo), add money, and see bankroll and per-game stats (hands, win rate, net result; craps points made, seven-outs and longest roll). Stakes are capped by your balance. In every game the balance you see drops by each chip you put down and comes back when you take it off or win, like a casino machine; it flashes red when it drops and green when it rises
- **Lobby header** — the Games tab shows the active profile's picture next to its name; tap either to open that profile's stats page
- **In-app update notifications** — prompted to download a newer version on launch if one is available

### Blackjack

- **Configurable table rules** — payout (3:2 / 6:5), dealer soft 17 (H17/S17), double after split, re-split aces, surrender mode, deck count, and continuous shuffle (CSM)
- **Chip denominations** — $15 / $25 / $50 (standard Vegas table minimums)
- **Vegas-style dealer play** — the dealer peeks for blackjack and ends the hand immediately on a natural; if you bust (or are dealt a natural), the dealer only flips the hole card instead of drawing out
- **Soft totals** — soft hands show both counts (e.g. `7/17`)
- **Large screens** — on a Galaxy Fold's inner screen or a tablet, bigger cards and buttons with split hands side by side; in landscape the felt sits on the left and a control panel on the right
- **Basic strategy assist** — gold highlight on the statistically optimal action at any time; the ⓘ left of Assist explains how it decides, with a few plays to remember
- **Sandbox mode** — step through any hand scenario by manually setting your cards and the dealer's up-card to study how basic strategy applies in specific situations

### Craps

- **Three variants** — Standard, Crapless (2/3/11/12 become point numbers), and Easy Craps (simplified bet menu for beginners)
- **Full bet menu** — Pass/Don't Pass, Come/Don't Come, Place, Buy, Lay, Hardways, Field, Proposition bets, and all 21 Hop combinations
- **Casino-accurate rules** — payouts, commissions and on/off rules follow a cited rules sheet (`assets/rules-docs/craps-rules.md`: the Venetian, the Nevada Gaming Control Board's crapless rules, Wikipedia and others). Buy and Lay take a 5% commission only on a win (on the win for Lay), with a $20 minimum buy and lays sized to win at least $20; Place and Buy are off on the come-out while Lay, Hardways and Big 6/8 keep working; Come bets open once a point is set
- **Configurable odds** — 1x, 2x, 3-4-5x, 5x, or 10x free odds; optional 3:1 payout on Field 12
- **Chips come out of your balance** — like a digital craps machine: a bet that stays up after a win (Place, Buy…) keeps its stake out and pays you the winnings
- **Place bet working toggle** — flip any Place bet ON/OFF between come-out and point phases
- **Strategy assist** — colour-coded bet quality: gold (Pass + max odds), white (acceptable), orange (poor), red (avoid). It also sizes bets so they pay exactly (e.g. Place 6/8 in $6s, so $18 rather than $15): on the table each Place stack and odds chip gets a green ring when it pays exactly and an amber one when the casino would round down, the reason line suggests exact amounts, and tapping a stack offers "Make it $18 (pays $21)", green odds steps and Max exact odds. The ⓘ left of Assist opens a short guide to what the colours mean
- **The table with chips** — turn your phone to landscape for a drawn casino felt (Pass Line, Field, Come, the number boxes, Big 6/8 and the centre props box). Drag a $1 / $5 / $25 / $100 chip onto an area, or tap a chip and then tap areas. Tap a stack for Take down, Odds ($1 / $5 / $25 steps up to the cap) and ON/OFF, or press **Clear** under the chips to take down everything allowed (Pass and Come bets on a point stay, without their odds); Buy/Lay, Hi-Lo, World and hops are under **More bets**, and their chips sit in a More bets strip under the props box. Press ROLL and two 3D dice are thrown across the felt, seen from above, tumbling and bouncing to a stop face-up, then rest on the result for a moment so you can read it (tap to skip) before the result banner. Two Come bets in one roll stack as one bet. A refused bet explains why on the reason line. In portrait you get the bet list, with a "Rotate for the table" hint and the same 3D dice throw; your bets, point and chip carry over when you turn the phone
- **Large screens** — on a Galaxy Fold's inner screen or a tablet the table shows in both orientations with bigger chips (×1.25); in portrait the felt fills the width with the reason line and chip tray below it

### Baccarat

- **Standard Baccarat** — Player, Banker (5% commission), Tie (8:1), Player Pair and Banker Pair (11:1) bets
- **Chip betting** — pick a main chip ($15 / $25 / $50 / $100) for Player and Banker ($15 table minimum) and a side chip ($1 / $5 / $10 / $25) for Tie and the pairs. Side bets have a dashed purple outline
- **Fully automatic rules** — all drawing rules applied after Deal; no player decisions required
- **Card squeeze** — reveal every card in real dealing order (P1, B1, P2, B2, then third cards) by dragging up to peel it back, or turn the header **Squeeze ●/○** toggle off for a quick automatic flip. The result waits until you tap **Next Hand**
- **Large screens** — on a Galaxy Fold's inner screen or a tablet, bigger cards and a bigger squeeze card; in landscape Banker and Player sit side by side like a real table, with the bets, Deal and balance in a side panel
- **Sandbox mode** — manually set all four starting cards, pick third cards step-by-step, and see the rule explanation driving each draw decision

### Roulette

- **Three wheels** — Single zero (European), Double zero (American) and Triple zero, chosen on the setup screen along with Slow or Fast spins
- **Full betting layout** — straight, split, street, corner, six line, basket / first four / first five (where the wheel allows), dozens, columns and the even-money bets; $10 table minimum (inside bets combined, each outside bet)
- **Drag-and-drop chips** — drag $1 / $5 / $25 / $100 chips from the tray onto the board (the chip sits mostly above your fingertip, with 75% of it visible, so you can see where it lands, and the numbers a split/corner/street covers light up), drag a stack to move it, or off the board to remove it; or **tap to place**: tap a tray chip to select it (gold ring; tap again to deselect) and tap the board to put it there, as many times as you like (tapping a stack adds to it, and the spot flashes so you see which bet you got); a chip you cannot afford is refused with a "Not enough balance" note; Undo and Clear
- **Animated wheel** — Slow and Fast play the same spin, the ball circling and dropping into its pocket; Fast does it in 1.5s; the winning number stays marked on the board and winning bets stay up for the next spin
- **Follows the phone** — the roulette table rotates between portrait and landscape layouts; the rest of the app stays portrait on phones, and large screens (e.g. a Galaxy Fold's inner screen) can rotate anywhere

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
| Orientation | expo-screen-orientation (portrait on phones, roulette and large screens unlock) |
| Testing | Jest + React Native Testing Library |

## Development

Privacy policy: [docs/privacy.md](docs/privacy.md) (no data collected; everything stays on the device).

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup, project structure, adding games, and publishing releases.
