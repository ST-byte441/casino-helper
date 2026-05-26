# Blackjack Basic Strategy ("The Book")

Basic strategy is the mathematically optimal play for every possible player hand vs. dealer upcard, assuming a standard multi-deck game (6–8 decks), dealer stands on soft 17, and doubling after split is allowed. These rules minimize the house edge to ~0.5%.

---

## Priority Order

When deciding your action, check in this order:

1. **Surrender** (if available)
2. **Split** (if you have a pair)
3. **Double Down**
4. **Hit or Stand**

---

## Surrender

Surrender sacrifices half your bet to avoid a bad situation. Only use it if the casino offers it.

| Your Hand | Dealer Upcard | Action     |
|-----------|---------------|------------|
| Hard 16   | 9, 10, A      | Surrender  |
| Hard 15   | 10            | Surrender  |

> If surrender is not available, hit these hands instead.

---

## Pair Splitting

| Your Pair | Dealer 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | A |
|-----------|----------|---|---|---|---|---|---|---|----|---|
| A–A       | SP | SP | SP | SP | SP | SP | SP | SP | SP | SP |
| 10–10     | S  | S  | S  | S  | S  | S  | S  | S  | S  | S  |
| 9–9       | SP | SP | SP | SP | SP | S  | SP | SP | S  | S  |
| 8–8       | SP | SP | SP | SP | SP | SP | SP | SP | SP | SP |
| 7–7       | SP | SP | SP | SP | SP | SP | H  | H  | H  | H  |
| 6–6       | SP | SP | SP | SP | SP | H  | H  | H  | H  | H  |
| 5–5       | D  | D  | D  | D  | D  | D  | D  | D  | H  | H  |
| 4–4       | H  | H  | H  | SP | SP | H  | H  | H  | H  | H  |
| 3–3       | SP | SP | SP | SP | SP | SP | H  | H  | H  | H  |
| 2–2       | SP | SP | SP | SP | SP | SP | H  | H  | H  | H  |

**Key:** SP = Split, S = Stand, H = Hit, D = Double

### Splitting Rules in Plain English

- **Always split:** Aces, 8s
- **Never split:** 10s, 5s (treat as hard 20 or hard 10)
- **Split 9s** against 2–6 and 8–9; stand against 7, 10, A
- **Split 7s** against 2–7
- **Split 6s** against 2–6
- **Split 4s** against 5–6 only
- **Split 2s and 3s** against 2–7

---

## Hard Totals (No Ace, or Ace counted as 1)

| Your Total | Dealer 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | A |
|------------|----------|---|---|---|---|---|---|---|----|---|
| 17+        | S  | S  | S  | S  | S  | S  | S  | S  | S  | S  |
| 16         | S  | S  | S  | S  | S  | H  | H  | H* | H* | H* |
| 15         | S  | S  | S  | S  | S  | H  | H  | H  | H* | H  |
| 14         | S  | S  | S  | S  | S  | H  | H  | H  | H  | H  |
| 13         | S  | S  | S  | S  | S  | H  | H  | H  | H  | H  |
| 12         | H  | H  | S  | S  | S  | H  | H  | H  | H  | H  |
| 11         | D  | D  | D  | D  | D  | D  | D  | D  | D  | H  |
| 10         | D  | D  | D  | D  | D  | D  | D  | D  | H  | H  |
| 9          | H  | D  | D  | D  | D  | H  | H  | H  | H  | H  |
| 8 or less  | H  | H  | H  | H  | H  | H  | H  | H  | H  | H  |

**Key:** S = Stand, H = Hit, D = Double Down  
\* = Surrender if available (see Surrender section)

### Hard Total Rules in Plain English

- **Hard 17+:** Always stand
- **Hard 13–16:** Stand vs. dealer 2–6; hit vs. 7–A
- **Hard 12:** Stand vs. 4–6; hit otherwise
- **Hard 11:** Double vs. 2–10; hit vs. Ace
- **Hard 10:** Double vs. 2–9; hit vs. 10 or Ace
- **Hard 9:** Double vs. 3–6; hit otherwise
- **Hard 8 or less:** Always hit

---

## Soft Totals (Hand Contains an Ace Counted as 11)

| Your Hand     | Total | Dealer 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | A |
|---------------|-------|----------|---|---|---|---|---|---|---|----|---|
| A–9           | Soft 20 | S | S | S | S | S | S | S | S | S | S |
| A–8           | Soft 19 | S | S | S | S | D | S | S | S | S | S |
| A–7           | Soft 18 | D | D | D | D | D | S | S | H | H | H |
| A–6           | Soft 17 | H | D | D | D | D | H | H | H | H | H |
| A–5           | Soft 16 | H | H | D | D | D | H | H | H | H | H |
| A–4           | Soft 15 | H | H | D | D | D | H | H | H | H | H |
| A–3           | Soft 14 | H | H | H | D | D | H | H | H | H | H |
| A–2           | Soft 13 | H | H | H | D | D | H | H | H | H | H |

**Key:** S = Stand, H = Hit, D = Double Down (if not allowed, hit)

### Soft Total Rules in Plain English

- **Soft 19–20 (A–8, A–9):** Always stand (soft 19 doubles vs. 6 in some rules)
- **Soft 18 (A–7):** Double vs. 2–6; stand vs. 7–8; hit vs. 9–A
- **Soft 17 (A–6):** Double vs. 3–6; hit otherwise
- **Soft 15–16 (A–4, A–5):** Double vs. 4–6; hit otherwise
- **Soft 13–14 (A–2, A–3):** Double vs. 5–6; hit otherwise

---

## Insurance & Side Bets

- **Never take insurance.** It is a separate bet that the dealer has blackjack. The house edge on insurance is ~7%, making it one of the worst bets at the table.
- **Never take "even money"** when you have blackjack and the dealer shows an Ace. It is mathematically equivalent to taking insurance.
- Avoid all side bets (Perfect Pairs, 21+3, Lucky Ladies, etc.) — they carry significantly higher house edges.

---

## Rule Variations That Change Strategy

| Rule Variation | Effect on House Edge | Strategy Adjustment |
|----------------|----------------------|---------------------|
| Dealer hits soft 17 (H17) | +0.22% for house | Double soft 18 (A7) vs. 2 |
| Single deck | −0.58% for player | Slight adjustments to doubles |
| Double after split allowed | −0.14% for player | More aggressive splitting |
| No hole card (European) | +0.11% for house | Avoid splitting vs. 10 or A |
| Blackjack pays 6:5 instead of 3:2 | +1.39% for house | Avoid this game if possible |

---

## Quick Reference Card

```
SPLITS:        Always: A-A, 8-8  |  Never: 10-10, 5-5
               2-2, 3-3, 7-7 vs 2-7  |  6-6 vs 2-6
               9-9 vs 2-6, 8-9  |  4-4 vs 5-6

DOUBLES:       11 vs 2-10  |  10 vs 2-9  |  9 vs 3-6
               Soft 13-18 (see soft table)

HARD STANDS:   17+ always  |  13-16 vs 2-6  |  12 vs 4-6

SURRENDER:     16 vs 9/10/A  |  15 vs 10

INSURANCE:     Never
```

---

*Source: This strategy is derived from computer simulations of millions of blackjack hands and is widely published by gaming mathematicians including Edward Thorp (Beat the Dealer, 1962) and the Wizard of Odds.*
