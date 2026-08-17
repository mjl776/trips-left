# Backend structure

NestJS + Prisma (PostgreSQL/Supabase) API for the fantasy football optimizer. Owns all logic — league/roster data, fantasy scoring, player analytics — the frontend is a thin client. Runs on port `8080` (override with `PORT`); needs `DATABASE_URL` (pooled) and `DIRECT_URL` (unpooled, migrations/scripts) in `.env`.

```
backend/
├── src/
│   ├── main.ts                  # Nest bootstrap
│   ├── app.module.ts            # root module — registers Prisma + feature modules
│   ├── app.controller.ts / .service.ts
│   ├── prisma.module.ts / prisma.service.ts   # global PrismaClient provider
│   │
│   ├── league/                  # create/import leagues + scoring settings
│   │   ├── league.controller.ts   # POST create-mock-league
│   │   │                          # POST import-sleeper-league/:leagueId
│   │   │                          # GET  view-sleeper-league/:leagueId
│   │   │                          # PATCH update-mock-league-settings/:leagueId
│   │   ├── league.service.ts
│   │   ├── league.models.ts       # DTOs
│   │   └── league.module.ts
│   │
│   ├── lineup/                  # roster construction
│   │   ├── lineup.controller.ts   # POST create-lineup
│   │   │                          # POST add-player
│   │   │                          # POST add-drop-player
│   │   │                          # DELETE remove-player
│   │   │                          # POST swap-players
│   │   │                          # GET  view-lineup
│   │   │                          # DELETE delete-lineup
│   │   ├── lineup.service.ts
│   │   ├── lineup.models.ts
│   │   └── lineup.module.ts
│   │
│   ├── player/                  # player lookups + season analytics
│   │   ├── player.controller.ts   # GET players
│   │   │                          # GET view-player
│   │   │                          # GET player-stat-rank
│   │   ├── player.service.ts
│   │   ├── player.models.ts
│   │   └── player.module.ts
│   │
│   ├── projections/             # fantasy scoring math
│   │   ├── projections.controller.ts  # GET projections
│   │   │                              # GET lineup-insights
│   │   ├── projections.service.ts
│   │   ├── projections.models.ts
│   │   ├── scoring.ts              # calculateFantasyPoints / realizedToStatLine — shared scoring logic, reused by trade module
│   │   └── projections.module.ts
│   │
│   └── trade/                   # 1-for-1 trade evaluator (see src/trade/CLAUDE.md)
│       ├── trade.controller.ts    # POST simulate-trade
│       ├── trade.service.ts
│       ├── trade.models.ts
│       └── trade.module.ts
│
├── prisma/
│   ├── schema.prisma             # models: Player, League, Roster, RosterPlayer, Projection, PlayerStats
│   └── migrations/                # timestamped SQL migrations, chronological
│
├── generated/prisma/             # `prisma generate` output — gitignored, not source
│
├── ingestions/                   # Python scripts pulling real historical NFL stats from nflverse
│   ├── pull_stats.py
│   └── requirements.txt
│
├── scripts/                      # one-off/maintenance TS scripts
│   ├── calculateHistoricalPoints.ts
│   └── syncPlayers.ts
│
├── data/                         # cached external API data dumps — gitignored
│   ├── historical-points-2024.json
│   └── players-nfl.json
│
├── documentation/
│   └── mock-lineup.md
│
├── test/                         # e2e tests (unit tests live next to source as *.test.ts)
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── prisma.config.ts
├── nest-cli.json
├── tsconfig.json / tsconfig.build.json
├── eslint.config.mjs / .prettierrc
└── package.json
```

## Module pattern

Every feature module follows the same four-file layout: `*.module.ts` (registers controller/service, imports `PrismaModule`), `*.controller.ts` (routes only), `*.service.ts` (all logic), `*.models.ts` (DTOs). New modules should mirror this and get registered in `app.module.ts`.

## Workflow for new features

1. Before writing code, propose a short plan: which module (new or existing), any `schema.prisma` changes, and the DTO shapes in `*.models.ts`. Wait for confirmation before implementing anything beyond a one-line fix.
2. Build in reviewable chunks: Prisma schema/migration first (if the feature needs one), then `*.service.ts`, then `*.controller.ts` wiring, then tests — not as one large diff. New modules follow the module pattern above and get registered in `app.module.ts` in the same PR.
3. Handle the failure branches, not just the happy path — `NotFoundException`/`BadRequestException` for missing rosters/leagues/players, invalid slot capacity, position ineligibility, etc. Controllers stay routing-only; validation and error branches belong in the service (see "Module pattern").
4. After implementation, run `npm run lint` and `npm run test` in `backend/` and fix any failures before returning. Run `npx prisma migrate dev` if you changed `schema.prisma`.
5. Write or update `*.controller.test.ts` / `*.service.test.ts` next to the files you touched, per the conventions in "Unit testing" below — including the new error branches.

## Don'ts

- Don't introduce new dependencies without flagging it first.
- Don't put business logic in a controller — controllers only delegate to a service method (see "Module pattern" and the controller-test convention below).
- Don't invent a Prisma field/relation — check `prisma/schema.prisma` first.
- Don't reimplement fantasy-scoring math — reuse `calculateFantasyPoints`/`realizedToStatLine` from `src/projections/scoring.ts` (see `src/trade/` for the precedent).
- Don't add a forward-looking `Projection`-based code path — that table has 0 rows; realized `PlayerStats` is the source of truth until a projection pipeline exists.

## Unit testing

Every `*.controller.ts` and `*.service.ts` has a matching `*.controller.test.ts` / `*.service.test.ts` next to it (e.g. `league/league.service.test.ts`). Jest's `testRegex` (in `package.json`) is `.*\.test\.ts$` — unit tests use the `.test.ts` suffix, not `.spec.ts`. (`test/*.e2e-spec.ts` is a separate, unrelated jest config/suffix for e2e — leave that one alone.)

- **Controller tests** mock the service (plain `{ methodName: jest.fn() }` object via `useValue`) and assert each controller method delegates to the right service method with the right args and returns its result — no business logic lives in controllers, so that's all there is to check.
- **Service tests** mock `PrismaService` via `src/test/prisma-mock.ts`'s `createMockPrismaService()` — a `jest.fn()` stub per Prisma model method actually used across the services (`league`, `player`, `roster`, `rosterPlayer`, `playerStats`, `projection`). Its `$transaction` mock handles both call forms used in the codebase: an array of already-invoked promises (`lineup.service.ts`'s `swapSlots`), and a callback receiving the transaction client (`addDropPlayer`) — in both cases it just runs against the same mock. Reuse this factory rather than hand-rolling Prisma mocks per test file. `dec(n)` builds a Prisma-`Decimal`-like value (`{ toNumber: () => n }`) for stat fields.
- Cover the success path plus every thrown `NotFoundException`/`BadRequestException` branch — services here are mostly validation chains (roster/league existence, slot capacity, position eligibility, duplicate assignments), so each branch is a real behavior worth pinning down, not incidental coverage.
- `prisma.service.ts` (bare `PrismaClient` wrapper, no logic) intentionally has no test file.

## Notes

- `Projection` table has 0 rows in the live DB — no forward-projection pipeline exists yet. Realized `PlayerStats` (2024/2025) is the source of truth for anything that needs per-player numbers; see `src/trade/CLAUDE.md` for the precedent.
- `REGULAR_SEASON_WEEKS = 18` is redefined as a local constant per-module rather than imported — intentional, not an oversight.
