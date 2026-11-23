# Token Radar — Methodology (token-radar-01)

Entry for make.fun "Build the best token launch radar". Snapshot: DefiLlama,
fetched 2026-11-14, 758 protocols at/above $5M TVL, watchlist 40 (TVL >= $50M,
records no token, not a wrapped/staked/bridged product). Deadline 14 Dec 2026
17:00 WIB. Prize $1,325, 1st $1,000.

## What "implied value" means here

The value a protocol's token WOULD be worth if it launched one day, assuming
its record stays as it is. It is the entry's own claim, never make.fun's. It
does not predict whether or when a token is issued.

## The model (radar-2)

Every input comes from the snapshot itself. No protocol name is special-cased.

```
multiple(cat) = median(mcap_usd / tvl_usd) over LIVE protocols in the same
                category with n >= 3; else the global median (0.205);
                clamped to [0.05, 1.50]
base          = tvl_usd x multiple(cat)
growthPct     = clamp(change_7d, -50, +100)         (null -> 0)
growthMult    = 1 + (growthPct / 100) x 0.5          -> [0.75, 1.50]
ageDays       = days(as_of - listed_at) or 365 if unknown
maturityMult  = 0.70 + min(ageDays, 1095) / 1095 x 0.30  -> [0.70, 1.00]
chainMult     = 1 + 0.02 x min(chains.length, 5)     -> [1.00, 1.10]
implied       = max(1, round(base x growthMult x maturityMult x chainMult))
```

Why each term:
- **Category multiple**: what the market actually pays per dollar of TVL for
  live protocols in the same line of business. A lending protocol is not
  priced like a DEX. Derived from the snapshot's own live rows, so the model
  follows from the snapshot's figures, not from a hardcoded 0.25 for all.
- **Growth**: a protocol whose TVL is growing fast is worth more than one the
  same size that is shrinking. Clamped hard because one row reports +4,448%.
- **Maturity**: a protocol that has run longer with no token has a larger,
  more proven user base, so a launch would be worth more; the premium is
  capped at +30% over the floor so age never dominates size.
- **Chain breadth**: running on more chains means more users reached; a small
  factor (at most +10%) so it never overrides the three main terms.

## The board

- 197 rows: every slug in the snapshot's watchlist (40) + every other rankable
  pre-token protocol (157). Rankable beyond the watchlist means: records no
  token, and not a wrapped, staked or bridged product of a token that already
  trades — the watchlist rule's own exclusions (Bridge, Canonical Bridge,
  Cross Chain Bridge, Liquid Staking, Liquid Restaking, Restaked BTC, CEX;
  no whole word wrapped/staked/staking in the name; not beginning with an
  exchange's name; no version marker). That keeps WBTC, Binance staked ETH,
  USDT0 and the big bridges off the board: they are tokens that already trade,
  not launches still to come. Ranks 1..197 by implied value, strictly
  non-increasing.
- Live-token protocols are kept apart in a "Live token" view showing the
  market's own values (top 32 by market cap), never mixed into the ranking.
- Each row carries: slug, name, category, chains, TVL, 7d change, age,
  implied value, and the model's breakdown (multiple, growth and maturity
  multipliers) so a reader can check the arithmetic.

## Farm plans

Six steps per protocol, generated from its own record (category, chains,
TVL, age) — never from a hand-written list of names. Each step states what
it costs and how long it takes:
1. Fresh wallet, seed offline.
2. The core action for the category (supply / provide liquidity / bridge /
   stake / deposit into a vault / mint / buy cover), sized by TVL tier
   ($300 / $200 / $100 / $50).
3. One qualifying action a week.
4. Hold at least N days (60 / 45 / 30 by age) so activity lands in more than
   one snapshot.
5. Check the protocol's own points/rewards page before withdrawing; never
   pay to claim.
6. Keep a farm log (wallet, dates, transactions).

## The dashboard

Static page, no network, no framework. Dark "radar" theme (deep navy, amber
accent). Board table (sortable by rank / TVL / 7d / age / implied value),
search + category + chain + min-TVL filters, watchlist-only toggle, detail
view per protocol with the full model breakdown and farm plan, a Model tab
showing the formula and the category-multiples table, and a Live token tab.
State lives in the URL hash, so each view has a linkable address.

## What is NOT in this run

- Repo creation + submit (later, before 14 Dec; max 5 submissions/day, 10 total).
- Screenshots: DONE — 3 real screenshots in entry/screenshots/ (board /
  detail / filtered), 1440x900, 140–156 KiB each, taken with the local
  Playwright headless shell; verified visually. (Note: /opt/meta-chromium/chrome
  refuses to start in this VM — "Hatch WebGL domain policy is required" — use
  ~/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell.)
- Transcripts: this session + its children are the build record; the submit
  run bundles them with the kit CLI.

## Status — 23 Nov 2026 (~14:25 WIB, foundation run)

Foundation COMPLETE and verified. `node entry/main.ts` runs clean (exit 0,
deterministic: two runs byte-identical board.json + data.js) and writes
out/board.json (197 rows), out/data.js, out/dashboard, out/screenshots,
out/dossier.json. Gate checks verified by hand (kit `check` needs a git repo
+ transcripts bundle, so it runs at submit time): 197 rows, ranks 1..197,
implied non-increasing, whole watchlist covered, farm steps 3–12 within
20–600 chars, dashboard 33,272 bytes (< 64 KB), screenshots 1440x900 /
140–156 KiB (≤ 512 KiB), no network calls, vendor/makefun-board.ts identical
to the kit's copy, dashboard farm steps == board.json farm steps on all 197
rows, model numbers agree. Two bugs found and fixed in this run: (1) bridges
and wrapped/staked products (WBTC, Binance staked ETH, USDT0, Coinbase/Base
Bridge, CCIP) topped the first board — isRankable now applies the watchlist
rule's own exclusions to early rows; (2) the board's default sort key did not
match the data field, so it rendered alphabetically — fixed to
implied_value_usd. Top 5: Steakhouse Financial $543.7M, Sentora Curator
$522.8M, Gauntlet $323.8M, Veda $307.7M, USDD $161.5M.

Still to do before submit: create the public GitHub repo (after 2026-11-14,
so any time now) with the entry layout, commit, bundle transcripts with the
kit CLI (redact personal details), run `node cli/makefun.mjs check --kit .`,
submit (max 5/day, 10 total). Deadline 14 Dec 2026 17:00 WIB.
