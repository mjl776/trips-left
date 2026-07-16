# TradeSimulator

UI for the 1-for-1 trade simulator. Follows the same page/component
convention as `LineupManagementLandingPage`/`ViewLineupPanel`: the
`frontend/app/trade-simulator/page.tsx` route is a thin wrapper that just
renders `<TradeSimulator />`.

## Component pieces to reuse — don't rebuild these

- **`AddPlayerOverlay`** (`frontend/components/AddPlayerOverlay`) — use it
  twice: once for "player you give up", once for "player you receive". It
  needs a `players: AddPlayerOverlayPlayer[]` list — fetch once from
  `GET {API_BASE_URL}/players` (same call `ViewLineupPanel` makes) and share
  it between both overlay instances; don't fetch twice.
- Style/layout conventions: CSS Modules (`page.module.css` alongside
  `index.tsx`), `"use client"` directive, `Escape`-to-close overlay pattern
  (see `AddPlayerOverlay`'s `useEffect` for the keydown listener) — copy this
  exactly for consistency.

## State machine

Two selected players (`playerOut`, `playerIn`, both nullable
`AddPlayerOverlayPlayer | null`) plus a fetch state for the comparison
(`idle | loading | error | success`). Only fire the `simulate-trade` request
once both are selected (a `useEffect` keyed on `[playerOut, playerIn]`).

## API call

```ts
const response = await fetch(`${API_BASE_URL}/simulate-trade`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ leagueId, season, playerOutId: playerOut.playerId, playerInId: playerIn.playerId }),
});
```

Follow the existing inline-`fetch` + `API_BASE_URL` convention (see
`frontend/lib/playerStats.ts`, `ViewLineupPanel`) — there is no shared
API-client module on this branch yet, so match current style rather than
introducing a new one.

`leagueId`/`season` come from wherever this page is entered from (query
param or a league picker — check how `lineup-management/view-lineup`
resolves `leagueId` today and mirror it) — `season` should default to the
same baseline season the rest of the app uses for "last completed season"
data (see `PROJECTION_BASE_SEASON` in `frontend/lib/playerStats.ts`; don't
hardcode a second copy of that year — import or mirror it).

## Response shape to render

Matches `backend/src/trade/CLAUDE.md`'s `SimulateTradeResponse`:
```ts
{
  playerOut: { playerId, fullName, position, team, value, efficiency, weeksPlayed };
  playerIn:  { playerId, fullName, position, team, value, efficiency, weeksPlayed };
  roi: number | null;
  simulation: { expectedDelta: number; winProbability: number; percentiles: { p10, p50, p90 } } | null;
  error?: string;
}
```

## What to render

1. **Two player slots** side by side, each opening `AddPlayerOverlay` on click when empty; once filled, show name/position/team (reuse the compact card look from `IndividualPlayerCardOverlay`, not the full stat modal).
2. **Value/efficiency comparison** — a simple two-column table: value, efficiency (show `"—"` when `efficiency` is `null`, e.g. K/DEF or no-data players — don't render `NaN` or crash).
3. **ROI** — single number, `null` renders as `"—"` with a short note ("no data for player given up") rather than a blank.
4. **Trade expectation** — when `simulation` is non-null: expected point delta (sign-colored: green if positive for the user, red if negative), win probability as a percentage, and the p10/p50/p90 band. When `simulation` is `null` (backend's `error: "simulation_unavailable"`), show the value/efficiency/ROI numbers anyway with a small inline notice that the simulation is temporarily unavailable — never block the whole page on it.
5. If `weeksPlayed === 0` for either player, show a "not enough data this season" note next to that player instead of a misleading `0` value.

If a distribution chart is added for the simulation result (e.g. a
histogram of the delta), use the `dataviz` skill before writing any chart
code/colors.
