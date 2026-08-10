
# Trips Left — Claude Code project instructions

Fantasy football lineup optimizer. A user attaches a league (mock or imported from Sleeper), builds a lineup, and gets three verdicts: **best player**, **worst player**, **dark horse**.

Monorepo: `backend/` (NestJS + Prisma + Postgres), `frontend/` (Next.js 16 + React 19).
Frontend also loads `frontend/AGENTS.md` — this Next.js version has breaking changes vs. training data; read `node_modules/next/dist/docs/` before writing App Router code.

---

## Commands

```bash
# frontend/
npm run dev        # next dev
npm run build      # next build
npm run lint       # eslint

# backend/
npm run start:dev  # nest watch mode
npm run test       # jest
npx prisma migrate dev
```

Env: frontend needs `NEXT_PUBLIC_API_URL` (no trailing slash — `lib/api.ts` strips it). Backend needs `DATABASE_URL` and optional `PORT` (default 8080). CORS is allow-listed in `backend/src/main.ts` to `localhost:3000`, `tripsleft.com`, `www.tripsleft.com` — add new origins there, not with a wildcard.

---

## Design tokens

Defined in `frontend/app/globals.css`. **Never hardcode a hex in a component** — use the variable or a `color-mix()` of it.

| Token | Value | Use |
|---|---|---|
| `--background` | `#0B1D3A` | Page background, only base surface |
| `--foreground` | `#00E5FF` | Primary accent: borders, position badges, active nav, primary buttons, "good" states |
| `--tertiary-color` | `#E84393` | Alerts and weak spots only: worst player, drop actions, destructive confirms |
| `--secondary-text-color` | `#FFFFFF` | Player names and body copy on dark surfaces |
| `--medium-bold` | `600` | Standard emphasis weight |

Derived surfaces follow the existing `color-mix` pattern rather than new variables:

```css
border: 1px solid color-mix(in srgb, var(--foreground) 15%, transparent);
background: color-mix(in srgb, var(--foreground) 3%, transparent);
/* hover */ background: color-mix(in srgb, var(--foreground) 8%, transparent);
```

Rules of thumb:
- Cyan is the interface; magenta is the warning. Never use magenta for decoration or for a positive state.
- Magenta is scoped to exactly two things: the worst-player row/badge, and drop/remove actions (`LineupSlot`'s remove button, `BenchRow`'s DROP button, hover states on both). It does **not** extend to score-based tiering — point numerals, percentile bars, and stat ranks in `IndividualPlayerCardOverlay` stay cyan regardless of how low the value is.
- Empty/null states (no worst player, no dark horse, no rankable stats for K/DEF) render as neutral muted cards, never as magenta/alert-styled boxes — see `LineupInsightsPanel` and `IndividualPlayerCardOverlay`.
- `Labels/SquareLabel` takes a `tone: "cyan" | "magenta"` prop; badges must set it explicitly (Best Player/Dark Horse → cyan, Worst Player → magenta) rather than relying on a default.
- Muted secondary text = `color-mix(in srgb, var(--secondary-text-color) 60%, transparent)`.
- Radii: `1rem` cards/rows, `0.75rem` badges/inputs, `50%` icon buttons.
- Transitions: `0.15s ease` on background/border only. No layout animation.

## Type scale

Fonts are loaded in `app/layout.tsx` via `next/font/google` and exposed as `--font-space-grotesk` (body, default) and `--font-orbitron` (`--font-orbitan` in the theme block — the typo is load-bearing, don't "fix" it without updating usages).

| Role | Size | Weight | Notes |
|---|---|---|---|
| Page display | `3rem`–`3.25rem` | 600 | Tight tracking, `-0.035em` |
| Section heading | `2rem` | 600 | |
| Card title | `1.25rem` | 600 | |
| Body | `1rem`/`0.875rem` | 400 | `0.875rem` inside dense rows |
| Micro label | `0.75rem` | 600 | Uppercase, `letter-spacing: 0.02em`+ |
| Numerals | inherit | 500 | Points, ranks, IDs — tabular alignment, right-aligned in rows |

Slot rows are fixed at `4.5rem` height with `1rem` gap (`components/LineupSlot`). Keep new list rows on that rhythm.

Numerals render via `var(--font-orbitan)`: point totals (`ProjectedPointsBox`, lineup/insight-card totals), ranks and percentiles (`IndividualPlayerCardOverlay`, `LineupInsightsPanel`).

---

## Component conventions

- One folder per component: `components/ComponentName/index.tsx` + `page.module.css`. Default export, `const X: FC<XProps> = ...`.
- **CSS Modules only.** Tailwind is installed and imported but the codebase does not use utility classes — do not introduce them.
- `"use client"` only where state/effects/`usePathname` are needed. Route files under `app/` stay server components that render a client component (see `app/lineup-management/view-lineup/page.tsx`).
- Shared logic goes in `frontend/lib/` as plain functions (`lineupSections.ts` — `getStarterLabels`/`buildStarterAssignments`/`getBenchPlayers`, `playerEligibility.ts`, `playerStats.ts`, `lineupTotals.ts` for starter point totals). Keep fetch calls out of components where a lib function already exists.
- Constants that mirror the backend live in `frontend/constants.ts` (`STARTER_SLOTS`, `BENCH_SLOTS`, `SLOT_ELIGIBILITY`, `RANKABLE_STAT_LABELS`, `POSITION_RANKABLE_STATS`). If you change `SLOT_ELIGIBILITY` or the mock roster in `backend/src/`, update this file in the same PR — they are duplicated by design and drift silently.
- Types shared with the backend live in `frontend/types/PlayerTypes.ts` (player/insights shapes) and `frontend/types/LeagueTypes.ts` (`League`) and must stay structurally identical to `backend/src/**/**.models.ts`.
- Bench is a flat list of current occupants (`getBenchPlayers`), not fixed indexed slots — there is no "add to bench" UI; players only reach the bench via a starter-slot swap.
- No state library. Component state + `localStorage` (`lib/savedLineups.ts`) is the whole model. Don't add Redux/Zustand/React Query without asking.
- No new dependencies without asking.

---

## Testing

Each frontend component has a react component test that renders the expected behavior of each component based on the component state, it should sit within each component folder

For lib fucntions, they should be placed within the tests folder 

---

## Endpoint → screen map

Base URL: `API_BASE_URL` from `lib/api.ts`. No auth of any kind — every route is public and identity is just `rosterId` + `leagueId` held in `localStorage`.

| Screen / component | Endpoints | Notes |
|---|---|---|
| `/` — `Homepage` | — | Static |
| `/about` — `AboutPageComponent` | — | Static |
| `/lineup-management` — `LineupManagementLandingPage`, `LineupBox`, `CreateLineupBox` | `GET /view-lineup` + `lib/playerStats.ts` (via `lib/lineupTotals.ts`, one call per saved lineup) | Lists saved lineups from `localStorage.savedLineups`; each card's starter point total is fetched, not cached |
| `/lineup-management/create` — `CreateLineupFlow` (owns the step state), `CreateLeagueStep`, `CreateLineupSlotsPanel`, `AddPlayerOverlay` | `POST /create-mock-league`, `POST /import-sleeper-league/:leagueId`, `GET /players`, `POST /create-lineup` | Step 1 attaches a league (mock or Sleeper import); step 2 only fills **starters** — bench isn't part of the create flow. `GET /players` returns the entire player list — search and slot eligibility are client-side (`lib/playerEligibility.ts`) |
| `/lineup-management/view-lineup` — `ViewLineupPanel`, `LineupSlot`, `BenchRow`, `LineupInsightsPanel` | `GET /view-lineup?rosterId&leagueId`, `POST /add-player`, `DELETE /remove-player`, `POST /swap-players`, `GET /lineup-insights?rosterId&leagueId&season` | Every mutation is immediate — no staged/batched save. Starter remove and bench SWAP/DROP each fire their own request and reload the lineup. `POST /add-drop-player` exists but the ported UI has no trigger for it (nothing in the current design replaces an occupied slot in one step). Best/worst/dark-horse badges come from `lineup-insights`, render through `Labels/SquareLabel`, and are echoed in the sidebar `LineupInsightsPanel` |
| `IndividualPlayerCardOverlay` | `GET /view-player?playerId&season[&leagueId][&includePostseason]`, `GET /player-stat-rank?playerId&season&stat` | Generic stat viewer for any player (rostered or not) — no dark-horse-specific prop/copy. `stat` must be one of `RANKABLE_STATS`: `passingAirYards`, `receivingAirYards`, `targetShare`, `wopr`, `passingCpoe`; which ones are fetched per player is position-gated by `POSITION_RANKABLE_STATS` in `constants.ts` — anything outside `RANKABLE_STATS` 400s |
| `ProjectedPointsBox` | `GET /view-player` (via `lib/playerStats.ts`) | See "projections" below |

### Request shapes worth memorizing

- Lineup mutations are **JSON bodies**, not query params — including `DELETE /remove-player`.
- `POST /create-lineup` takes `{ leagueId, name, assignments: [{ playerId, slot }] }` and validates slot capacity and position eligibility server-side; a 400 here is a real user error, surface the message.
- `POST /swap-players` takes `{ rosterId, leagueId, playerAId, playerBId }` — **both players must already be rostered**. It swaps their `slot` values; it is not "put this free agent in the lineup."
- `POST /add-drop-player` is transactional (drop then add, rolls back together).
- `GET /view-lineup` returns the full Prisma `roster` record including `rosterPlayers[].player` and `league` — including `league.rosterPositions`, which is what `lib/lineupSections.ts` splits into starters vs. `BN`.

---

## Domain rules that constrain the UI

- **Slot codes are `DEF`, not `D/ST`, and `BN` for bench.** `SLOT_ELIGIBILITY` maps `FLEX → RB/WR/TE`; `BN` is unrestricted; unlisted slots are unrestricted.
- **Mock league roster is fixed**: `QB RB RB WR WR TE FLEX FLEX K DEF` + 10 `BN`, `numTeams: 1`, `season: 2026`, Sleeper's default scoring (`DEFAULT_SCORING_SETTINGS`). The user does not choose scoring or team count at creation — do not build UI implying they can.
- **"Projected points" are last season's realized totals.** `PROJECTION_BASE_SEASON = 2025` in `lib/playerStats.ts`; the number shown comes from `GET /view-player`'s `totalPoints`. `GET /projections` exists and applies league scoring to `Projection` rows, but depends on ingested projection data — treat it as not wired to the UI. Label these as season totals, never "week N projection."
- **K and DEF always score 0** — `player_stats` has no FG-made or points-allowed columns yet. They're excluded from worst-player for that reason. Don't render them in a "lowest scorer" list.
- **`worstPlayer` is `null`** when fewer than two non-K/DEF players are rostered. `bestPlayer` and `darkHorse` can also be `null`. Every insights consumer needs an empty state.
- **Dark horse** = rostered player (not the best player) at QB/RB/WR/TE whose season EPA total clears the top-20% cutoff for their position, ranked by margin. The response carries `stat`, `value`, `leagueThreshold`, `positionRank`, `positionPlayerCount`, `percentile` — show the reasoning, not just the badge.
- Stats exclude the NFL postseason (weeks ≤ 18) unless `includePostseason=true`.

---

## Not supported today — do not build UI for these

- Editing league scoring after creation. `PATCH /update-mock-league-settings/:leagueId` exists but the service is a deliberate no-op stub that returns `void`.
- Weekly projections and week-by-week historical views. Everything is season-level.
- Waiver wire / free-agent pool, trade analysis.
- Writing anything back to Sleeper — imports are read-only.
- Server-side player search or pagination. `GET /players` is the whole list; filter client-side.
- Accounts, auth, multi-user. Saved lineups are `localStorage` on one device.

If a task seems to need one of these, stop and ask rather than inventing an endpoint.

---

## Known inconsistencies (don't propagate)

- `backend/documentation/mock-lineup.md` is stale: it lists `PATCH /swap-players` (actually `POST`), `POST /import-sleeper-league` without `:leagueId`, and `GET /calculate-projected-points` (actually `GET /projections`). **Controllers are the source of truth.** Update the doc when you touch a route.
- `backend/src/lineup/lineup.service.ts` still has `console.log` calls. Remove them if you're editing that file; don't add more.
- `frontend/lib/usePlayerPicker.tsx` is dead code — a duplicate of `playerEligibility.ts`'s eligibility filter that nothing imports. Don't build on it; either delete it or fold it into `playerEligibility.ts` next time you're in this area.

## PR checklist

1. `npm run lint` in `frontend/` passes.
2. Backend and frontend copies of `SLOT_ELIGIBILITY` / roster constants still agree.
3. Shared types in `frontend/types/PlayerTypes.ts` match `*.models.ts`.
4. No new hex colors, no Tailwind utility classes, no new dependencies.
5. Null states handled for `bestPlayer` / `worstPlayer` / `darkHorse`.
6. Route docs updated if a controller changed.
