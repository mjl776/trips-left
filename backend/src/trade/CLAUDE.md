# Trade module

Evaluates a 1-for-1 player trade: value, efficiency, ROI, plus a Monte Carlo
trade expectation computed by the `simulation-service` (see its own CLAUDE.md).

## Why realized stats, not `Projection`

The `Projection` table has 0 rows in the live DB — there's no forward-projection
pipeline yet. `PlayerStats` (realized) has full 2024/2025 data. Following the
precedent already set in `frontend/lib/playerStats.ts` (`PROJECTION_BASE_SEASON
= 2025`, "last season's real totals" as the projection baseline), this module
computes everything from the most recently complete season's realized
`PlayerStats`, not from `Projection`. Mirror `PROJECTION_BASE_SEASON` — don't
invent a second constant for the same idea; import or match it.

## Module layout (mirrors `backend/src/projections/`)

- `trade.module.ts` — registers `TradeController`/`TradeService`, imports `PrismaModule`.
- `trade.controller.ts` — one route.
- `trade.service.ts` — all logic.
- `trade.models.ts` — DTOs.
- Register `TradeModule` in `backend/src/app.module.ts` alongside the other feature modules.

## Route

`POST simulate-trade`

Request body (`SimulateTradeRequest`):
```ts
{
  leagueId?: string;     // v1: optional — omitted falls back to DEFAULT_SCORING_SETTINGS
  season: number;        // baseline season for realized stats, e.g. 2025
  playerOutId: string;   // player given up
  playerInId: string;    // player received
}
```

## Computing per-player numbers

For each of `playerOutId`/`playerInId`, query `PlayerStats` rows for
`{ playerId, season, week: { lte: REGULAR_SEASON_WEEKS } }` (copy the
`REGULAR_SEASON_WEEKS = 18` local-constant pattern used in
`projections.service.ts` and `player.service.ts` — don't import across
modules for a magic number).

Reuse `calculateFantasyPoints`/`realizedToStatLine` from
`../projections/scoring.ts` exactly as `projections.service.ts` does — do not
reimplement scoring math here. Scoring settings come from a private
`getScoringSettings(leagueId?: string)`, mirroring the precedent in
`player.service.ts`: an omitted `leagueId` skips the DB lookup entirely and
returns `DEFAULT_SCORING_SETTINGS` from `league.models.ts`; a `leagueId` that
*is* provided but doesn't resolve to a real league still throws
`NotFoundException` — only omission falls back, a bad ID is still an error.
There is no per-league roster/ownership check here — v1 doesn't require the
caller to be in a league at all (see `TradeSimulator`'s frontend CLAUDE.md).

Per player, per week: `weeklyPoints[i] = calculateFantasyPoints(realizedToStatLine(row), scoringSettings)`.

- **value** = `sum(weeklyPoints)`
- **efficiency** = `value / opportunities`, where `opportunities = sum(targets + carries + attempts)` across the same rows (Decimal fields — use `decimalToNumber` from `scoring.ts`). If `opportunities === 0` (e.g. K/DEF), return `efficiency: null` rather than dividing by zero.
- **roi** = `(valueIn - valueOut) / valueOut * 100`. If `valueOut === 0`, return `roi: null`.

If a player has zero `PlayerStats` rows for the season (rookie, no data), return `value: 0`, `efficiency: null`, and still send an empty `weeklyPoints: []` to the simulation service — don't throw. The frontend is expected to show a "not enough data" state (see its CLAUDE.md).

## Calling the simulation service

`POST {SIMULATION_SERVICE_URL}/simulate-trade` (new env var, same pattern as
`NEXT_PUBLIC_API_URL` — read via `process.env.SIMULATION_SERVICE_URL`, no
trailing slash assumed, trim like `frontend/lib/api.ts` does).

Request body sent to the Python service:
```ts
{
  playerOut: { playerId: string; weeklyPoints: number[] };
  playerIn:  { playerId: string; weeklyPoints: number[] };
  trials?: number; // default 10000, let the Python service own the default
}
```

`weeklyPoints` is the raw list of realized per-week fantasy point totals
computed above — the Python service bootstrap-resamples from this array
directly. Don't compute mean/stddev/floor/ceiling in Node; send the raw
samples and let the simulation service derive whatever it needs.

If the HTTP call to the simulation service fails or times out, return the
value/efficiency/ROI numbers with `simulation: null` and an
`error: "simulation_unavailable"` field rather than failing the whole request
— those numbers don't depend on the Python service and are still useful on
their own.

## Response shape (`SimulateTradeResponse`)

```ts
{
  playerOut: { playerId, fullName, position, team, value, efficiency, weeksPlayed };
  playerIn:  { playerId, fullName, position, team, value, efficiency, weeksPlayed };
  roi: number | null;
  simulation: {
    expectedDelta: number;       // mean(simulated playerIn total - playerOut total)
    winProbability: number;      // 0-100, % of trials favoring playerIn
    percentiles: { p10: number; p50: number; p90: number }; // of the delta
  } | null;
  error?: string;
}
```

Fetch `fullName`/`position`/`team` via `prisma.player.findUnique` for both IDs; 404 (`NotFoundException`) if either player doesn't exist, matching `getLineupInsights`'s `NotFoundException` pattern.
