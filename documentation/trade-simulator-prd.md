# Trade Simulator — PRD

## Overview

Trips Left currently lets users build and view mock lineups but has no way to
evaluate a trade. This feature lets a user pick a player they'd give up and a
player they'd receive, and see the trade scored on **value**, **efficiency**,
and **ROI**, plus a **Monte Carlo-simulated trade expectation** (win
probability and expected point swing) computed by a new Python service.

## Goals

- Let a user compare one player against one other player (1-for-1) across
  value, efficiency, and ROI.
- Quantify the uncertainty in that comparison via Monte Carlo simulation,
  not just a single point estimate.
- Produce a single "trade expectation" summary: expected point delta, win
  probability, and a percentile band.

## Non-goals (v1)

- N-for-M / multi-player trades (2-for-1, 3-for-2, etc.) — v1 is 1-for-1
  only; the data model and API should not actively block generalizing later,
  but building that generalized UI/logic now is out of scope.
- Persisting or sharing simulated trades (no `Trade` table) — every request
  is stateless and computed fresh.
- Real forward-looking projections — see **Data reality** below.

## Data reality (read before implementing)

The `Projection` table (`floor`/`ceiling`/`stdDev`/`projPoints` per
player-week) has **0 rows** in the live database — there is no
forward-projection pipeline yet. `PlayerStats` (realized results) has full
2024 and 2025 season data (14k+ rows, 4.2k players). As of today the 2025
season is the most recently completed one and 2026 hasn't started, so
there's no "rest of season" to project against literally.

The existing frontend code already has a workaround for this exact problem:
`frontend/lib/playerStats.ts` uses `PROJECTION_BASE_SEASON = 2025` — "last
season's real totals" — as its projection baseline, since there's no
forward-projection model. **This feature follows the same convention**:
value/efficiency are computed from a player's realized `PlayerStats` for the
most recent completed season, and the Monte Carlo simulation bootstrap-
resamples from that player's own realized weekly point totals rather than
assuming a parametric distribution from projection fields that don't exist.
This requires no schema changes for v1. If a real projections pipeline is
built later, the trade module can prefer `Projection` rows when present and
fall back to this approach otherwise.

## Metrics

All three reuse the existing `calculateFantasyPoints`/`realizedToStatLine`
functions in `backend/src/projections/scoring.ts` and a league's
`scoringSettings` — no new scoring logic.

| Metric | Formula | Notes |
|---|---|---|
| **Value** | `sum(calculateFantasyPoints(week) for week in season)` | Total realized fantasy points for the baseline season, `week <= 18` (regular season only, matches `REGULAR_SEASON_WEEKS` convention already used in `projections.service.ts`/`player.service.ts`). |
| **Efficiency** | `value / (targets + carries + attempts)` summed over the same weeks | Points per opportunity/touch — separates volume from per-touch skill. `null` (not zero) when opportunities are 0, e.g. K/DEF or no games played. |
| **ROI** | `(valueIn − valueOut) / valueOut × 100` | Return on the value given up. `null` when `valueOut` is 0. |
| **Trade expectation** | From Monte Carlo (below): expected point delta, win probability, p10/p50/p90 band | The uncertainty-aware summary — the headline number for the feature. |

## Monte Carlo simulation

**Method:** bootstrap resampling, not a parametric distribution. Given how
few weekly samples exist per player (10–18 games), fitting a normal/
truncated-normal is overconfident. Instead, resample with replacement
directly from the player's own realized weekly point totals — this makes no
distributional assumption and degrades gracefully for players with sparse
data (a 3-game rookie still produces a valid, appropriately wide,
distribution).

**Procedure**, per trial (run 10,000 trials, vectorized with numpy — not a
Python-level loop):
1. Draw `horizon_weeks` samples with replacement from `playerOut`'s weekly
   point list; sum → one season-total draw.
2. Do the same for `playerIn`.
3. `delta = playerIn draw − playerOut draw`.

Across all trials:
- **Expected delta** = mean of `delta`.
- **Win probability** = % of trials where `delta > 0`.
- **Percentile band** = p10/p50/p90 of `delta`.

A player with zero realized games contributes an always-zero draw (not an
error) — the comparison still resolves, just skewed toward whichever side
has real production.

## Architecture

Three new pieces. Full contracts are written up as `CLAUDE.md` spec docs
already committed in each directory — this PRD summarizes; those are the
implementation source of truth:

1. **`backend/src/trade/`** — new NestJS module (mirrors
   `backend/src/projections/`). Route: `POST simulate-trade`. Fetches both
   players' `PlayerStats`, computes value/efficiency/ROI, calls the
   simulation service, merges the result. See
   `backend/src/trade/CLAUDE.md`.
2. **`simulation-service/`** — new top-level Python service (FastAPI). Single
   endpoint `POST /simulate-trade`. Stateless — no DB access, no
   credentials; receives raw weekly point arrays and returns the simulation
   summary. Reached via a new `SIMULATION_SERVICE_URL` env var (same pattern
   as `NEXT_PUBLIC_API_URL`). See `simulation-service/CLAUDE.md`.
3. **`frontend/components/TradeSimulator/`** + `frontend/app/trade-simulator/page.tsx`
   — new page, mirrors the `LineupManagement`/`ViewLineupPanel` pattern.
   Reuses `AddPlayerOverlay` (twice, for give/receive) and the
   `IndividualPlayerCardOverlay` card style. See
   `frontend/components/TradeSimulator/CLAUDE.md`.

### Why a separate Python service, not a subprocess or TS reimplementation

Decided to keep Python for the actual Monte Carlo math (per user preference)
rather than reimplementing in TypeScript. A small FastAPI microservice
(rather than NestJS spawning a subprocess per request) keeps the numeric
code in its natural ecosystem (numpy) without per-request process-spawn
overhead, and keeps it cleanly stateless/testable on its own. It needs a new
Railway (or equivalent) deployment alongside the existing NestJS backend.

### API contracts (summary — see each CLAUDE.md for full detail)

`POST {API_BASE_URL}/simulate-trade` (frontend → NestJS):
```jsonc
// Request
{ "leagueId": "string", "season": 2025, "playerOutId": "string", "playerInId": "string" }

// Response
{
  "playerOut": { "playerId": "...", "fullName": "...", "position": "...", "team": "...", "value": 0, "efficiency": 0, "weeksPlayed": 0 },
  "playerIn":  { "playerId": "...", "fullName": "...", "position": "...", "team": "...", "value": 0, "efficiency": 0, "weeksPlayed": 0 },
  "roi": 0,
  "simulation": {
    "expectedDelta": 0,
    "winProbability": 0,
    "percentiles": { "p10": 0, "p50": 0, "p90": 0 }
  },
  "error": "simulation_unavailable (optional, if the Python service call fails)"
}
```

`POST {SIMULATION_SERVICE_URL}/simulate-trade` (NestJS → Python):
```jsonc
// Request
{
  "player_out": { "player_id": "string", "weekly_points": [0, 0, 0] },
  "player_in":  { "player_id": "string", "weekly_points": [0, 0, 0] },
  "trials": 10000,
  "horizon_weeks": null
}

// Response
{ "expected_delta": 0, "win_probability": 0, "percentiles": { "p10": 0, "p50": 0, "p90": 0 } }
```

## Error handling / edge cases

- Either player not found → `404 NotFoundException` (matches existing
  `getLineupInsights` pattern).
- Zero realized `PlayerStats` rows for a player (rookie, no data) → `value: 0`,
  `efficiency: null`, still send an empty `weekly_points: []` to the
  simulation service rather than erroring.
- Simulation service unreachable/times out → backend still returns
  value/efficiency/ROI with `"simulation": null` and
  `"error": "simulation_unavailable"` — the trade comparison shouldn't be
  fully blocked by the simulation piece.
- Both players with zero data → simulation returns a neutral 50%/0-delta
  result rather than dividing by zero.

## Build order

1. ✅ `CLAUDE.md` spec docs written in each new directory (this PRD's
   companion docs — already committed):
   - `backend/src/trade/CLAUDE.md`
   - `simulation-service/CLAUDE.md`
   - `frontend/components/TradeSimulator/CLAUDE.md`
2. ✅ Implement `simulation-service` (FastAPI + numpy). Verify standalone via
   curl/pytest with fixture inputs before wiring it to the backend.
3. ✅ Implement `backend/src/trade` NestJS module. Verify via curl against real
   `playerId`s from the dev DB.
4. Implement the frontend `TradeSimulator` page. Verify via a manual browser
   walkthrough (golden path + a no-data-player edge case).
5. End-to-end verification (below).

## Verification plan

- `simulation-service`: unit tests — identical inputs on both sides → ~50%
  win probability; a strictly higher-scoring side → win probability > 90%
  and positive expected delta; both sides empty → neutral 50/0 result.
- `backend/src/trade`: curl `POST simulate-trade` with two real player IDs
  from the dev DB — confirm value/efficiency/ROI are plausible against known
  season totals, and that a simulation-service outage degrades to
  `simulation: null` rather than a 500.
- Frontend: run dev server, pick a give/receive player pair in the browser,
  confirm the comparison and simulation results render; repeat with a
  player who has zero games played this season to confirm the "not enough
  data" state renders instead of crashing.

## Open questions / future work

- Generalizing to N-for-M trades — aggregate value/efficiency across
  multiple players per side; UI needs multi-select instead of one
  `AddPlayerOverlay` slot per side.
- Persisting/sharing a simulated trade (new `Trade` table) once the core
  metrics are validated.
- Swapping the realized-stats baseline for real forward projections once a
  projections pipeline exists — the `Projection` table and its
  `floor`/`ceiling`/`stdDev` fields are already there, just unpopulated.
- Positional scarcity / replacement-level adjustment to ROI (a marginal RB2
  vs RB1 swap "costs" differently than raw point value suggests) — flagged
  as a possible v2 refinement, not required for v1.
