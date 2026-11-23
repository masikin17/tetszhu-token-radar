[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/masikin17/tetszhu-token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/masikin17/tetszhu-token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Radar

A token launch radar for make.fun's ["Build the best token launch radar"](https://make.fun/bounty/token-radar-01) bounty. It reads the sealed DefiLlama snapshot of 758 protocols, ranks the ones that record no token by what their launch would be worth, and hands in a web dashboard with the board, a detail view per protocol and the steps to farm each one.

## The model (radar-2)

Every input comes from the snapshot itself — no protocol name is special-cased. Implied value per protocol:

```
multiple(cat) = median FDV/TVL of live protocols in the same category (n ≥ 3),
                else the global median (0.21x); clamped to [0.05, 1.50]
base          = TVL × multiple(cat)
growth        = 1 + clamp(TVL change 7d, -50%, +100%) × 0.5
maturity      = 0.70 + min(days since listing, 1095) / 1095 × 0.30
chains        = 1 + 0.02 × min(chain count, 5)
implied       = max(1, round(base × growth × maturity × chains))
```

Rankable means: records no token (no market cap, CoinGecko id or symbol) and is not a wrapped, staked or bridged product of a token that already trades — the watchlist rule's own exclusions. The board holds 197 rows: the whole 40-protocol watchlist plus 157 early pre-token protocols below the floor. Live-token protocols are kept apart in a "Live token" tab showing market values, never mixed into the ranking.

Top 5 by implied value: Steakhouse Financial $543.7M, Sentora Curator $522.8M, Gauntlet $323.8M, Veda $307.7M, USDD $161.5M.

Each row carries a 6-step farm plan generated from its own record (category, chains, TVL, age), with what each step costs and how long it takes. See [METHODOLOGY.md](METHODOLOGY.md) for the full model, numbers and verification.

## Run

Node.js 22.18 or later (the grader runs Node 22.23.4), standard library only, no install step. In the grader's container it runs as `node main.ts` against `/input/snapshot.json` and writes to `/output`. Locally, against the kit's sealed snapshot:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

That writes `out/board.json` (197 ranked rows), `out/data.js` (the dashboard's dataset), copies `dashboard/` and `screenshots/` into `out/`, and writes `out/dossier.json` via `vendor/makefun-board.ts`. Two runs write the same bytes.

## Layout

- `main.ts` — entrypoint: reads the snapshot, scores, writes the board and dossier
- `lib/model.ts` — the radar-2 model, board builder and farm plans
- `vendor/makefun-board.ts` — the kit's dossier library, byte for byte
- `dashboard/` — static page (no network, no framework): sortable/filterable board, per-protocol detail, Model and Live token tabs
- `screenshots/` — board, detail and filtered views (1440×900)
- `LICENSE` — MIT

## License

MIT — see [LICENSE](LICENSE).
