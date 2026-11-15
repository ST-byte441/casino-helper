# Craps Rules Reference

> **Source of truth.** This file is built from these four documents:
> 1. **Ven:** The Venetian Resort Las Vegas, *How to Play Craps*: https://www.venetianlasvegas.com/resort/casino/table-games/craps-basic-rules.html
> 2. **HR:** Hard Rock Casino Cincinnati, *Craps*: https://casino.hardrock.com/cincinnati/casino/table-games/craps
> 3. **RW:** Riverwind Casino, *Craps Odds Explained for Beginners* (2026-03-24): https://www.riverwind.com/blog/craps-odds/
> 4. **Wiki:** Wikipedia, *Craps*, read 2026-11-14: https://en.wikipedia.org/wiki/Craps
> 5. **NGCB:** Nevada Gaming Control Board, *Crapless Craps – Rules of Play* (scanned one-page PDF, dated 2018-10-01): https://www.gaming.nv.gov/siteassets/content/divisions/enforcement/rules-of-play/Crapless_Craps.pdf
> 6. **PN:** PokerNews, *Crapless Craps* (casino terms), read 2026-11-14: https://www.pokernews.com/casino/casino-terms/crapless-craps.htm
>
> **Crapless precedence:** the NGCB is the regulator's rules of play, so where sources disagree on crapless craps, **NGCB wins**. See **Source Errata** at the end.
>
> Each rule is tagged with the source(s) that state it. Items marked **(derived)** are calculated from sourced rules rather than stated in a source. Items marked **(app)** are this app's own choices where the sources are silent or vary by casino. **Easy Craps is an app-only teaching variant**: none of the sources describe it. Wikipedia's craps article carries "needs more citations" tags on its rules sections, so where it is the only source, treat the rule as typical rather than universal.
>
> **Payout wording.** "X to 1" (X:1) means the stake comes back plus X. "X for 1" includes the stake, so **8 for 1 = 7 to 1**. The Venetian quotes proposition and hardway payouts "for 1"; this file converts everything to "to 1". *(Ven, Wiki)*

---

## Dice and True Odds

Two dice give 36 equally likely outcomes. *(RW, Wiki)*

| Total | Ways | Chance | Against |
|---|---|---|---|
| 2 / 12 | 1 | 2.78% | 35 to 1 |
| 3 / 11 | 2 | 5.56% | 17 to 1 |
| 4 / 10 | 3 | 8.33% | 11 to 1 |
| 5 / 9 | 4 | 11.11% | 8 to 1 |
| 6 / 8 | 5 | 13.89% | 6.2 to 1 |
| 7 | 6 | 16.67% | 5 to 1 |

*(RW)*

**Number before 7** (the true odds every odds, place and buy payout is measured against) *(derived from the table; Wiki and RW state the 4/10, 5/9 and 6/8 rows)*:

| Number | Ways vs 7's six | True odds |
|---|---|---|
| 4 or 10 | 3 vs 6 | 2 to 1 |
| 5 or 9 | 4 vs 6 | 3 to 2 |
| 6 or 8 | 5 vs 6 | 6 to 5 |
| 3 or 11 (crapless) | 2 vs 6 | 3 to 1 |
| 2 or 12 (crapless) | 1 vs 6 | 6 to 1 |

---

## Variants

### Standard Craps (Bank craps / Las Vegas craps)
- Come-out naturals 7 and 11; craps 2, 3, 12; points 4, 5, 6, 8, 9, 10. *(Ven, HR, RW, Wiki)*
- All bet types available. *(app)*
- **Don't Pass bar:** the casino bars **12** (2 wins, 12 pushes) or **2** (2 pushes, 12 wins), never both. All three casino sources bar 12. *(HR, Ven, RW, Wiki)* The app bars 12. *(app)*

### Crapless Craps
- Also called "bastard craps"; invented by Bob Stupak at Vegas World in the 1980s. *(Wiki)*
- Dealt with the **same procedures as standard craps**, with the exceptions below; **all other bets are unchanged** from standard craps. *(NGCB)*
- **Come-out:** **7 is the only Pass Line winner**, paying even money. Every other number becomes the point. *(NGCB, Ven)*
- **2, 3, 11 and 12 become points**: they are not an automatic loss, and **11 is not an automatic winner**. *(NGCB, Ven)*
- **No Don't Pass or Don't Come bets.** *(NGCB; PN: "typically absent")* A player must bet the Pass Line to shoot. *(HR)*
- **Free odds:** 2 and 12 pay **6 to 1**; 3 and 11 pay **3 to 1**; all other numbers pay the same odds as standard craps. *(NGCB; PN: odds allowed on all point numbers)*
- **Place bets on 2, 3, 11, 12** are allowed: **2 and 12 pay 25 to 5 (5 to 1)**; **3 and 11 pay 13 to 5**. *(NGCB)*
  - House edge at those payouts: Place 2/12 **14.29%**, Place 3/11 **10.00%**. *(derived: true odds 6 to 1 and 3 to 1)*
  - Wikipedia gives 11 to 2 (7.14%) and 11 to 4 (6.25%) instead. Some casinos may pay that, but the NGCB rule is the regulator's. *(Wiki; see Errata)*
  - Bet 2/3/11/12 in **multiples of $5** for exact payouts. *(derived from the "to 5" payouts)*
- **Lay bets:** the operator **may or may not offer** them; if offered, a **5% vig** is taken. *(NGCB)* **App:** offered. *(app)* Laying 2/12 pays 1 to 6 and 3/11 pays 1 to 3. *(derived from true odds)*
- **Buy bets** on 2, 3, 11, 12 are not mentioned by the NGCB. *(not covered)* The app offers them at true odds (6 to 1, 3 to 1) less vig. *(app)*
- Pass Line house edge **5.38%**. *(Wiki)* PN says only that it is "much higher" than standard craps.
- Odds limits for 2, 3, 11 and 12 under 3-4-5× are **not covered** by the sources. **App:** 1× on 2/12 and 2× on 3/11, so the maximum odds bet pays 6× the line bet, as 3-4-5× does on the other points. *(app)*

### Easy Craps (app-only)
- **Not from any source.** A teaching variant made for this app.
- Same come-out as Crapless (7 natural; 2, 3, 11, 12 become points).
- No Come, Don't Pass/Don't Come, Buy, Lay or Big 6/8.
- Adds **Low Field** (2, 3, 4 at 2 to 1) and **High Field** (10, 11, 12 at 3 to 1).

### Other variants the sources mention (not in the app)
- **11 as a point:** Pass/Don't Pass don't win or lose on a come-out 11; making it pays 3 to 1 odds; Pass edge rises to 9.75%. *(Wiki)*
- **New York craps:** no Come/Don't Come; box-number bets; 5% house edge. *(Wiki)*
- **Bar 3** on Don't Pass (4.39% edge). *(Wiki)*

---

## Come-Out Phase

The shooter rolls before a point is established. *(Ven, HR, Wiki)*

| Roll | Standard | Crapless / Easy |
|---|---|---|
| 7 | Natural: Pass wins, Don't Pass loses | Natural: Pass wins |
| 11 | Natural: Pass wins, Don't Pass loses | Point = 11 |
| 2 | Craps: Pass loses, Don't Pass wins | Point = 2 |
| 3 | Craps: Pass loses, Don't Pass wins | Point = 3 |
| 12 | Craps: Pass loses, Don't Pass **pushes** (bar 12) | Point = 12 |
| 4, 5, 6, 8, 9, 10 | Point set | Point set |

*(Standard: Ven, HR, RW, Wiki. Crapless: Ven. Easy: app.)*

## Point Phase

- **The point rolls before a 7:** Pass wins, Don't Pass loses; next roll is a new come-out with the same shooter. *(Ven, HR, RW, Wiki)*
- **7 rolls first (seven-out):** Pass loses, Don't Pass wins, and the dice pass to the next shooter, clockwise. *(HR, Wiki)*
- **Any other roll:** no effect on the line bets. 2, 3, 11 and 12 don't affect line bets once a point is set. Single-roll bets always resolve. *(Wiki)*

## Shooter and Table Procedure

- A player must have a Pass or Don't Pass bet to shoot (Pass only, in crapless). *(HR, Wiki)*
- The shooter throws both dice, in one throw, so they bounce off the far wall. *(HR, Wiki)*
- All bets must be placed before the shooter throws. *(Ven)*
- A die that leaves the table is a "no roll". A die landing in the bank, the stickman's bowl or the rails is invalid; a die resting on another die or on chips is in play. *(Wiki)*
- Handle the dice with one hand only; toss, don't slide. *(Wiki)*

---

## Bet Types

### Pass Line
- **Wins:** 7 or 11 on the come-out; the point before a 7. **Loses:** 2, 3, 12 on the come-out; 7 before the point. *(Ven, HR, RW, Wiki)*
- **Payout:** even money. *(Ven, Wiki)*
- **Contract bet:** once the point is set it can't be reduced or removed until it's decided. *(HR, Wiki)*
- Bet only when no point is set. *(Wiki)*
- House edge **1.41%**. *(Wiki)*

### Don't Pass
- **Wins:** 2 or 3 on the come-out; 7 before the point. **Loses:** 7 or 11 on the come-out; the point before a 7. **12 pushes** on the come-out (bar 12). *(Ven, HR, RW, Wiki)*
- **Payout:** even money. *(Ven, Wiki)*
- **No-contract bet:** after the point it may be **reduced or removed**, but not placed or increased. *(HR, Wiki)* Removing it is not recommended (it is now the favourite). *(Wiki)*
- House edge **1.36%**. *(Wiki)*

### Come / Don't Come
- Work like Pass / Don't Pass but are made **only after a point is set**. The next roll acts as the bet's own come-out. *(Ven, Wiki)*
  - **Come:** 7 or 11 wins; 2, 3, 12 loses; 4, 5, 6, 8, 9, 10 becomes the **come point**, and the dealer moves the bet to that box. The come point before a 7 wins. *(Ven, Wiki)*
  - **Don't Come:** 2 or 3 wins; 12 pushes; 7 or 11 loses; a number becomes the don't-come point. A 7 before that point wins. *(Ven, Wiki)*
- Even money. Come is a contract bet once moved to a number; Don't Come can be reduced or removed but not increased. *(Wiki)*
- One Come bet per player per roll; Come and Don't Come may both be made on the same roll. *(Wiki)*

### Free Odds (behind Pass / Come)
- Taken once a point (or come point) is set; pays **true odds**, **0% house edge**. *(Ven, RW, Wiki)*

| Point | Payout |
|---|---|
| 4 or 10 | 2 to 1 |
| 5 or 9 | 3 to 2 |
| 6 or 8 | 6 to 5 |

*(Ven, RW, Wiki)*

- Odds can be added, reduced, removed or turned off at any time before they lose. *(Wiki)*
- **Come odds are off on the come-out roll** by default: if a 7 comes, the Come bet loses but its odds are **returned**; if the come point rolls, the Come bet wins but its odds are **returned** (unless the player called them working). *(Wiki)*

### Lay Odds (behind Don't Pass / Don't Come)
- You lay (risk more to win less) at true odds, no commission, 0% house edge. *(Ven, Wiki)*

| Point | Payout |
|---|---|
| 4 or 10 | 1 to 2 |
| 5 or 9 | 2 to 3 |
| 6 or 8 | 5 to 6 |

*(Wiki)*

- Lay odds on a Don't Come point are **always working**, including on the come-out, unless the player says otherwise. *(Wiki)*

### Odds Multiples
- Common limits: single, double or 5×; some casinos offer **3-4-5×** (3× on 4/10, 4× on 5/9, 5× on 6/8); some run 100× promotions. *(Wiki)* The app also offers 10×. *(app)*
- Under 3-4-5×, the maximum odds bet always **pays 6× the line bet**. *(Wiki)*
- **Don't side:** the cap is on the **win**. At 5× odds, a Don't Pass bet plus its lay odds can win at most 6× the Don't Pass bet. *(Wiki)* So under 3-4-5× a don't player may lay **6×** the flat bet on every point, and the lay wins 3×, 4× or 5×. *(derived)*
- Odds bets may have to meet the table minimum (Las Vegas), or the line bet plus odds together (Atlantic City, Pennsylvania). *(Wiki)*

| Setting | Max odds (Pass / Come) |
|---|---|
| 1× | 1× the line bet |
| 2× | 2× the line bet |
| 3-4-5× | 3× on 4/10, 4× on 5/9, 5× on 6/8 |
| 5× | 5× the line bet |
| 10× | 10× the line bet *(app)* |

### Place Bets
- Win when your number rolls before a 7. *(Ven, Wiki)*

| Number | Payout | House Edge |
|---|---|---|
| 4 or 10 | 9 to 5 | 6.67% |
| 5 or 9 | 7 to 5 | 4.00% |
| 6 or 8 | 7 to 6 | 1.52% |
| 2 or 12 (crapless) | **25 to 5** (5 to 1) | 14.29% |
| 3 or 11 (crapless) | **13 to 5** | 10.00% |

*(payouts: Ven, Wiki; crapless payouts: NGCB; edges: Wiki, crapless edges derived. Wikipedia's 11 to 2 / 11 to 4 crapless payouts are in the Errata.)*

- **Off on the come-out** and working once a point is set, unless the player says otherwise. *(Wiki)*
- Can be **taken down any time** before the next roll. *(Ven, Wiki)*
- Bet 4/5/9/10 in multiples of $5 and 6/8 in multiples of $6 for exact payouts. *(Wiki)*
- **Place to lose** (rare): wins on a 7 before the number; 5 to 11 on 4/10, 5 to 8 on 5/9, 4 to 5 on 6/8. *(Wiki)* Not offered in the app. *(app)*

### Buy Bets
- Pay **true odds** (2 to 1 on 4/10, 3 to 2 on 5/9, 6 to 5 on 6/8) for a **5% commission (vig) on the amount bet**. *(Wiki)*
- **When the vig is charged varies:** traditionally up front; many casinos now take it **only on a win**. Some charge a flat fee (e.g. $1 on $25). Example: a winning $25 buy on the 10 pays **$49** ($50 less a $1 vig). *(Wiki)*
- Some casinos require at least $20 so the $1 vig applies. *(Wiki)*
- Off on the come-out unless the player says otherwise. *(Wiki)*
- House edge **4.76%** with vig up front; with vig on wins only: 4/10 **1.67%**, 5/9 **2.00%**, 6/8 **2.27%**. *(Wiki)*
- **App:** the vig is charged **only on a win**, as 5% of the bet rounded **down** to the dollar, minimum $1, so the $25 buy on 10 pays $49. **Minimum buy $20**, so the $1 vig never eats the win. *(app, matching the Wiki example and the $20 minimum some casinos use)*

### Lay Bets
- Bet that a 7 rolls before your number; pays **reverse true odds** (1 to 2 on 4/10, 2 to 3 on 5/9, 5 to 6 on 6/8). *(Wiki)*
- The 5% vig is on the **amount you'd win, not the amount bet**. A $40 lay on the 4 wins $20, so the vig is **$1**, not $2. *(Wiki)*
- Some casinos charge the vig only on a win; some require a bet that wins at least $20 (a $40 lay on 4/10). *(Wiki)*
- **Always working, even with no point**, unless the player says otherwise. *(Wiki)*
- Removable or reducible any time before it loses. *(Wiki)*
- House edge (vig up front / on wins only): 4/10 **2.44% / 1.67%**, 5/9 **3.23% / 2.00%**, 6/8 **4.00% / 2.27%**. *(Wiki)*
- **App:** vig only on a win, as 5% of the **win** rounded down to the dollar, minimum $1. **A lay must win at least $20**: $40 on 4/10, $30 on 5/9, $24 on 6/8, $60 on 3/11, $120 on 2/12. *(app, following the casinos Wiki describes)*

### Big 6 / Big 8
- Pays even money when the 6 (or 8) rolls before a 7; true odds 6 to 5; house edge **9.09%**. *(Wiki)*
- **Always working**, including on the come-out. *(Wiki)*
- Not offered in Atlantic City (prohibited by law) and omitted by many casinos. Place 6/8 at 7 to 6 is strictly better. *(Wiki)*

### Field (single roll)
- Wins on 2, 3, 4, 9, 10, 11, 12; loses on 5, 6, 7, 8. *(Ven, Wiki)*
- Even money on 3, 4, 9, 10, 11. *(Ven, Wiki)*
- **2 pays 2 to 1.** *(Ven, Wiki)*
- **12 pays 2 to 1 (5.56% edge) or 3 to 1 (2.78%)**: the casino chooses; the Venetian pays 3 to 1. *(Ven, Wiki)* The app's table setting picks one. *(app)*
- Variants: 3 to 1 on both 2 and 12 (0% edge); 11 paying 2 to 1 alongside 12 at 3 to 1. *(Wiki)*

### Low Field / High Field (Easy Craps only)
- **App-only.** Low Field: 2, 3, 4 pay 2 to 1, anything else loses. High Field: 10, 11, 12 pay 3 to 1, anything else loses.

### Hardways
- Win when the number rolls **as a pair** before it rolls the easy way or a 7. Not a single-roll bet. *(Ven, Wiki)*

| Bet | Payout | House Edge |
|---|---|---|
| Hard 4 (2-2) / Hard 10 (5-5) | 7 to 1 (Ven: "8 for 1") | 11.11% |
| Hard 6 (3-3) / Hard 8 (4-4) | 9 to 1 (Ven: "10 for 1") | 9.09% |

*(Ven, Wiki)*

- **Las Vegas: working on the come-out** unless the player says otherwise. Atlantic City: off when there's no point. *(Wiki)* The app follows Las Vegas. *(app)*

### Proposition Bets (single roll)

| Bet | Wins on | Payout | House Edge |
|---|---|---|---|
| Any 7 ("Big Red") | 7 | 4 to 1 (Ven: "5 for 1") | 16.67% |
| Any Craps | 2, 3, 12 | 7 to 1 (Ven: "8 for 1") | 11.11% |
| Aces (2) | 2 | 30 to 1 (Ven: "31 for 1") | 13.89% |
| Ace-Deuce (3) | 3 | 15 to 1 (Ven: "16 for 1") | 11.11% |
| Yo (11) | 11 | 15 to 1 (Ven: "16 for 1") | 11.11% |
| Twelve (12) | 12 | 30 to 1 (Ven: "31 for 1") | 13.89% |
| Hi-Lo | 2 or 12 | 15 to 1 | 11.11% |

*(Ven, Wiki)*

### C&E (Craps and Eleven)
- **Half the bet goes on Any Craps (7 to 1) and half on 11 (15 to 1).** *(Wiki)*
- So, on the whole bet: **2, 3 or 12 pays 3 to 1**; **11 pays 7 to 1**; any other roll loses. *(Wiki)*
  - e.g. $2 C&E on a 3: the craps half wins $7, the 11 half loses $1, net **+$6** (3 to 1). On an 11: +$15 − $1 = **+$14** (7 to 1). *(derived)*
- House edge **11.11%**. Minimum is double the smallest single-roll unit. *(Wiki)*

### Horn (4 units)
- One unit each on 2, 3, 11, 12; minimum 4× the unit. *(Wiki)*
- Net on the whole bet: 2 or 12 pays **27 to 4**; 3 or 11 pays **3 to 1**; anything else loses. House edge **12.5%**. *(Wiki)*
- **Horn High:** a 5-unit bet with the extra unit on one number (e.g. "horn high yo"). *(Wiki)* Not offered in the app. *(app)*

### World / Whirl (5 units)
- Horn plus Any 7. Net: 2 or 12 pays **26 to 5**; 3 or 11 pays **11 to 5**; **7 pushes**; anything else loses. House edge **13.33%**. *(Wiki)*

### Hop Bets (single roll)
- A bet on one exact dice combination on the next roll. *(Ven, Wiki)*
- **Easy hop** (two different dice, e.g. 2-5, which can land two ways): **15 to 1**, 11.11%. **Hard hop** (a pair, e.g. 3-3): **30 to 1**, 13.89%. *(Wiki; Ven: "31 to 1 or 16 to 1", i.e. for 1)*

### Side Bets the sources mention (not in the app)
- **Fire Bet:** pays after 4, 5 or 6 different points are made (24, 249, 999 to 1). *(Wiki)*
- **Bonus Craps / Dice-Ology:** All Small (2–6), All Tall (8–12), All (or "Boom or Bust") before a 7; Wiki gives 35 for 1, 35 for 1 and 176 for 1. *(Wiki; Ven names Little Ones, Big Ones, Boom or Bust without payouts)*

---

## Working and Not Working (summary)

| Bet | On the come-out | Notes |
|---|---|---|
| Pass / Come | Always working | Contract bets *(Wiki)* |
| Pass / Come odds | Come odds **off** | Returned on a come-out decision unless called working *(Wiki)* |
| Don't Come lay odds | **Working** | Unless the player says otherwise *(Wiki)* |
| Place / Buy | **Off** | Working once a point is set *(Wiki)* |
| Lay | **Working** | Unless the player says otherwise *(Wiki)* |
| Big 6 / 8 | **Working** | *(Wiki)* |
| Hardways | **Working** (Las Vegas) | Off in Atlantic City *(Wiki)* |
| Single-roll bets | Working | Center bets usually working by default *(Wiki)* |

Players can call any bet "On" or "Off"; the dealer marks it with a button. *(Wiki)*

---

## House Edge Summary

| Bet | Edge | Source |
|---|---|---|
| Pass / Come | 1.41% | Wiki |
| Don't Pass / Don't Come | 1.36% | Wiki |
| Free odds / lay odds | 0% | Wiki |
| Place 6/8 | 1.52% | Wiki |
| Place 5/9 | 4.00% | Wiki |
| Place 4/10 | 6.67% | Wiki |
| Buy (vig on wins only) | 1.67% (4/10), 2.00% (5/9), 2.27% (6/8) | Wiki |
| Lay (vig on wins only) | 1.67% (4/10), 2.00% (5/9), 2.27% (6/8) | Wiki |
| Field (2:1 on 12 / 3:1 on 12) | 5.56% / 2.78% | Wiki |
| Big 6/8 | 9.09% | Wiki |
| Hard 6/8 | 9.09% | Wiki |
| Hard 4/10 | 11.11% | Wiki |
| Any Craps, 3, 11, Hi-Lo, C&E, easy hop | 11.11% | Wiki |
| Horn | 12.5% | Wiki |
| World | 13.33% | Wiki |
| 2, 12, hard hop | 13.89% | Wiki |
| Any 7 | 16.67% | Wiki |
| Crapless Pass Line | 5.38% | Wiki |
| Crapless Place 2/12 (25 to 5) | 14.29% | derived from NGCB |
| Crapless Place 3/11 (13 to 5) | 10.00% | derived from NGCB |

---

## Strategy Summary

| Quality | Bets |
|---|---|
| **Gold: best value** | Pass/Come/Don't Pass/Don't Come plus maximum free odds |
| **White: acceptable** | Line bets without full odds, Place 6/8, Buy 4/10 (vig on wins only) |
| **Orange: poor** | Place 4/5/9/10, Field, Big 6/8 |
| **Red: avoid** | Hardways, Any 7, Any Craps, Proposition bets, Horn, World, Hop bets, Low/High Field |

The lowest house edge in the casino is a minimum line bet with full odds; other bets lose "three to twelve times faster". *(Wiki)*

---

## Not Covered by These Sources

The app needs its own decision for these, and this file marks each one **(app)** where used:

- Odds limits on crapless points 2, 3, 11 and 12 under 3-4-5× (app: 1× on 2/12, 2× on 3/11).
- Buy bets on crapless 2, 3, 11 and 12 (the NGCB lists only odds and place bets for those numbers).
- Whether a crapless table offers Lay bets (the NGCB leaves it to the operator; the app does).
- Payout rounding when an odds or place bet isn't an exact multiple (e.g. $5 of odds on a 6).
- Table minimums and maximums for this app's table.
- Easy Craps and its Low/High Field bets (app-only).

---

## Source Errata

- **PN: 11 on the crapless come-out.** PokerNews says Pass Line players "still win if a 7 or 11 is rolled on the come-out roll". The NGCB says **7 is the only Pass Line winner** and "a roll of 11 will not be an automatic winner"; the Venetian agrees (any number other than 7 becomes the point). This file follows the NGCB.
- **PN: crapless house edges by point.** PokerNews gives "Point 2 or 12: approximately 7.14%" and "Point 3 or 11: about 6.25%". Those match Wikipedia's **place-bet** edges at 11 to 2 and 11 to 4, not a Pass Line edge on those points, so they look mislabelled. Not used here.
- **Wiki vs NGCB: crapless place payouts.** Wikipedia says place 2/12 pays 11 to 2 and 3/11 pays 11 to 4. The NGCB rules of play say **25 to 5** and **13 to 5**. Payouts can differ by casino, but this file follows the regulator.

