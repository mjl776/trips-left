# Lineup Page Loading States & Stats Cache — PRD

## Context

The view-lineup page (`/lineup-management/view-lineup`) feels slow and looks
broken while it loads:

- **No loading UI.** `ViewLineupPanel` fetches `/view-lineup` and
  `/lineup-insights` client-side in `useEffect`. Until they resolve, the
  roster renders empty and `LineupInsightsPanel` (`insights === null`) shows
  its *empty-state* copy ("No players rostered yet."), so the user sees a
  lineup that looks empty instead of loading. Errors are only `console.error`'d.
  `frontend/CLAUDE.md` requires explicit loading, empty and error states.
- **Stale insights.** `/lineup-insights` is only fetched on mount. After an
  add, remove or swap, the best/worst/dark-horse badges keep showing old data.
- **Slow backend.** `PositionStatsService.getFantasyPointsDistribution`
  (`backend/src/stats/position-stats.service.ts:123`) pulls *every*
  `PlayerStats` row for a position+season and scores each in Node. It runs once
  per distinct position, on every `/view-lineup` and `/view-player` request.
  `getColumnDistribution` (`:81`, used by dark horse in `/lineup-insights`) runs
  a `groupBy` per request, and its only cache is a per-request `Map`
  (`projections/projections.service.ts:241`). Both results depend only on
  position, season and scoring settings, **not on the roster**, and 2025
  stats change only when `ingestions/pull_stats.py` is run by hand. Today
  nothing is cached anywhere in the stack.
- **N+1 on the landing page.** `lib/lineupTotals.ts:fetchStarterPointsTotal`
  calls `/view-lineup` *without* `season`, then fans out one `/view-player`
  per starter, for each saved lineup.

## Goals

1. The view-lineup page shows a clear loading placeholder (skeleton) for the
   roster and the insights panel, and distinct loading, empty and error states.
2. Insights refresh after every lineup mutation.
3. Repeat loads of `/view-lineup`, `/lineup-insights` and `/view-player` skip
   the per-position distribution computation (a cache hit instead).
4. The landing page makes one request per saved lineup instead of 1 + N.

## Non-goals

- Redis or any new infrastructure. This PRD uses an in-memory store behind an
  interface; Redis is the documented upgrade path (see **Future work**).
- Caching whole HTTP responses. Responses depend on the roster, which users
  mutate.
- Next.js server-side fetching or a data library (SWR/React Query). The
  frontend's no-new-dependencies rule applies.
- Skeletons on the landing page (`LineupBox` keeps its "—" placeholder).

---

## Part A: Loading placeholders (frontend)

### A1. `Skeleton` primitive: `frontend/components/Skeleton/`
- `index.tsx` + `page.module.css`, following the one-folder-per-component
  convention. Props: `width?: string`, `height?: string`,
  `radius?: "card" | "badge" | "round"` (maps to `1rem` / `0.75rem` / `50%`),
  `className?`.
- Renders a `<span aria-hidden="true">` block. Fill is
  `color-mix(in srgb, var(--foreground) 6%, transparent)` with a subtle
  shimmer: an animated `background-position` on a linear-gradient of
  `color-mix(... 6%)` → `color-mix(... 12%)`. No new hex colors and no layout
  animation. The shimmer is disabled under
  `@media (prefers-reduced-motion: reduce)`.
- Consumers wrap a loading region in a container with `aria-busy="true"` and a
  visually hidden "Loading…" label, so screen readers get one announcement
  rather than one per block.

### A2. `LineupInsightsPanel`: explicit status
- New prop: `status: "loading" | "ready" | "error"` (plus the existing
  `insights`, `season`).
- `loading`: all three cards keep their tag headers (BEST PLAYER / WORST
  PLAYER / DARK HORSE), which stops the layout jumping. The name, detail and
  value lines become `Skeleton` blocks. The dark horse card also gets a
  bar-track skeleton.
- `error`: a single neutral muted card ("Couldn't load insights.") with a
  **Retry** button that calls a new `onRetry` prop. Per CLAUDE.md, it is not
  styled magenta.
- `ready`: the current rendering, unchanged, including the existing
  per-card null states.

### A3. `ViewLineupPanel`: roster loading, errors and insights refresh
`frontend/components/ViewLineupPanel/index.tsx`
- Add `lineupStatus` and `insightsStatus` state
  (`"loading" | "ready" | "error"`), both starting at `"loading"`.
- `loadLineup` (L71): check `response.ok`, and set `error` in `catch`.
  Only the **initial** load shows the skeleton. Reloads after a mutation keep
  the current roster visible (the existing `isMutating` disabling is enough).
- Roster skeleton while `lineupStatus === "loading"`:
  - header: skeletons for the league label, the lineup name and the points
    total;
  - starters: skeleton rows at the `4.5rem` slot height with a `1rem` gap. Use
    10 rows, the fixed mock roster starter count, since `starterLabels` is
    unknown before the load;
  - bench: a few skeleton rows in `benchGrid`.
- Roster error state: a neutral muted card with **Retry** calling `loadLineup`.
- Move the insights fetch (L122-136) into a named `loadInsights` function that
  sets `insightsStatus`. Call it on mount, as today, **and** after each
  successful mutation in `handleAddPlayer`, `handleRemovePlayer` and
  `handleSwapComplete`, in parallel with `loadLineup()`
  (`await Promise.all([loadLineup(), loadInsights()])`). The insights panel
  shows its skeleton during the refresh (confirmed choice).
- Guard against out-of-order responses: keep a request counter in a ref and
  ignore any insights response that isn't the latest one.
- Pass `status={insightsStatus}` and `onRetry={loadInsights}` to
  `LineupInsightsPanel`. While insights are loading, the best, worst and dark
  horse slot badges simply don't render (`lineupInsights` is kept as-is until
  the new data lands, or cleared, whichever looks cleaner in review).

### A4. Route-level fallback
`app/lineup-management/view-lineup/page.tsx` wraps the panel in `<Suspense>`
with no fallback. Pass a fallback that renders the same page skeleton, so the
first paint isn't blank. Extract the skeleton layout into
`ViewLineupPanel/ViewLineupSkeleton.tsx` so A3 and A4 share it. Read
`node_modules/next/dist/docs/` for Suspense/`useSearchParams` behavior in this
Next version before touching the route (per `frontend/AGENTS.md`).

---

## Part B: Stats distribution cache (backend)

### B1. New `cache/` module (follows the four-file module pattern)
```
backend/src/cache/
├── cache.module.ts        # @Global(); provides CACHE_STORE + CacheService; registered in app.module.ts
├── cache.service.ts       # wrap/get/set/flush; single-flight; hit/miss counters
├── cache.controller.ts    # POST admin/cache/flush
├── cache.models.ts        # CacheStore interface, FlushCacheResponse DTO
└── in-memory-cache.store.ts
```

**`CacheStore` interface** (the Redis upgrade seam):
```ts
interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  deleteByPrefix(prefix: string): Promise<number>;
  clear(): Promise<number>;
}
```
It is provided under an injection token (`CACHE_STORE`), so a
`RedisCacheStore` could replace the in-memory one without touching callers.

**`InMemoryCacheStore`**: a `Map<string, { value, expiresAt }>`. Expired
entries are evicted lazily when read. A soft size cap (e.g. 500 entries)
evicts the oldest entry first, which guards against unbounded growth from many
distinct scoring configs. No new dependency.

**`CacheService.wrap<T>(key, ttlMs, loader)`**:
- returns the cached value on a hit;
- on a miss, runs `loader()` once. Concurrent callers for the same key share
  the in-flight promise (a `Map<string, Promise>`), so the first page load's
  parallel per-position calls, or two tabs, don't compute the same thing
  twice;
- does **not** cache rejected promises: on error, the in-flight entry is
  removed and the error is rethrown;
- logs cache hits and misses at debug level (the existing `LoggingInterceptor`
  already logs request timing, which serves as the before/after metric).

TTL comes from env `STATS_CACHE_TTL_MS` (default **12h**).
`STATS_CACHE_ENABLED=false` bypasses the cache entirely, as a kill switch.

### B2. Cache the two distributions in `PositionStatsService`
`backend/src/stats/position-stats.service.ts`: inject `CacheService` and
wrap each method body. The public signatures stay the same, so
`lineup.service.ts`, `player.service.ts` and `projections.service.ts` need no
signature changes.

| Method | Key |
|---|---|
| `getFantasyPointsDistribution` | `stats:pts:{position}:{season}:{postseason?1:0}:{scoringHash}` |
| `getColumnDistribution` | `stats:col:{position}:{column}:{aggregation}:{season}:{postseason?1:0}` |

- `scoringHash` = SHA-1 (Node `crypto`, built in) of a **key-sorted**
  JSON serialization of `scoringSettings`, so logically equal settings hash
  identically regardless of key order. Put it in a small `stableHash()` helper
  in `cache/`.
- Cached arrays are shared across requests: return them as `readonly` types,
  and check that no caller sorts or mutates them in place (e.g. `.sort()`
  without copying). Copy at the call site if one does.
- Remove the now-redundant per-request `distributionCache` `Map` in
  `projections.service.ts:241-266`.

### B3. Invalidation: TTL plus a manual flush
- `POST /admin/cache/flush` (optional body `{ prefix?: string }`, defaulting
  to `stats:`). It requires header `x-admin-token` to equal env
  `CACHE_FLUSH_TOKEN`. If that env var is unset, the endpoint is disabled
  (responds 404), so it's safe by default. A wrong or missing token gets a
  401. It returns `{ flushed: number }`. The controller is routing-only, and
  the checks live in `CacheService`.
- `ingestions/pull_stats.py`: after a successful upsert, if `CACHE_FLUSH_URL`
  and `CACHE_FLUSH_TOKEN` are set, POST to the flush endpoint using stdlib
  `urllib.request`, so `requirements.txt` gains no new package. Log a warning,
  but don't fail the ingest, if the flush call fails.
- **Known limitation:** the flush clears only the instance that receives the
  request. That's fine while Railway runs a single backend instance. With more
  instances, the TTL is the backstop, and this is the trigger to move to
  Redis.
- The `Player` table (`syncPlayers.ts`) doesn't affect the cached values,
  which are keyed only by `playerId`. League scoring changes produce a new
  `scoringHash`, so they never read stale data.

### B4. Env and docs
- Add `STATS_CACHE_TTL_MS`, `STATS_CACHE_ENABLED` and `CACHE_FLUSH_TOKEN` to
  the backend env docs (README / `backend/CLAUDE.md`), and set
  `CACHE_FLUSH_TOKEN` in Railway.
- Add `cache/` to the `backend/CLAUDE.md` structure tree.
- Add the new admin endpoint to the route docs.

---

## Part C: Landing page N+1 (frontend)

`frontend/lib/lineupTotals.ts:fetchStarterPointsTotal`
- Call `/view-lineup` **with** `season=PROJECTION_BASE_SEASON` (the same
  URL-building style as `ViewLineupPanel.loadLineup`), so each
  `rosterPlayers[].stats` comes embedded.
- Build `statsByPlayerId` from those embedded stats (the same mapping as
  `ViewLineupPanel` L86-91; extract it to a shared `lib/` helper, e.g.
  `buildStatsByPlayerId(rosterPlayers)`, and use it in both places). Then pass
  it to the existing `computeStarterPointsTotal`.
- Drop the `fetchPlayerStatsByPlayerId` fan-out here. Keep that function,
  since `ProjectedPointsBox` and others still use `playerStats.ts`.
- Result: one request per saved lineup, served from the backend distribution
  cache when warm.

---

## Rollout order (reviewable chunks)

1. **Backend cache:** `cache/` module + `CacheService` tests, then wiring into
   `PositionStatsService`, then the flush controller, then the
   `pull_stats.py` hook.
2. **Frontend primitives:** `Skeleton` + tests.
3. **`LineupInsightsPanel` status prop** + tests.
4. **`ViewLineupPanel`:** loading/error states, insights refresh, race guard,
   `ViewLineupSkeleton`, route Suspense fallback + tests.
5. **Landing N+1:** `lineupTotals.ts` + shared helper + lib tests.

Parts 1 and 2 through 5 are independent and can be separate PRs.

## Testing / verification

**Backend** (Jest, `createMockPrismaService()` from `src/test/prisma-mock.ts`):
- `cache.service.test.ts`:
  - covers hit, miss, TTL expiry (with fake timers), and single-flight (two
    concurrent `wrap` calls → loader called once);
  - checks that a rejected loader is not cached;
  - covers `flush` by prefix, and the disabled, 401 and success branches.
- `cache.controller.test.ts`: checks it delegates to the service.
- `position-stats.service.test.ts`:
  - a second call with the same args doesn't call `playerStats.findMany` or
    `groupBy` again;
  - different scoring settings trigger another query;
  - key-order-shuffled settings produce a cache hit.
- Update `projections.service.test.ts` for the removed per-request Map.
- `npm run lint && npm run test` in `backend/`.

**Frontend** (Vitest + RTL, `createFetchMock` in `ViewLineupPanel/index.test.tsx`):
- `Skeleton/index.test.tsx`: renders with `aria-hidden`.
- `LineupInsightsPanel/index.test.tsx`:
  - `loading` shows the skeletons and card tags, and hides the empty-state
    copy;
  - `error` shows retry and calls `onRetry`;
  - `ready` behaves as today.
- `ViewLineupPanel/index.test.tsx`:
  - the skeleton shows before fetches resolve;
  - the error card appears on a non-ok `/view-lineup`;
  - `/lineup-insights` is fetched again after add, remove and swap;
  - a stale insights response is ignored.
- `lib/tests/lineupTotals.test.ts`: one fetch with `season` in the URL, and no
  `/view-player` calls.
- `npm run lint && npm run test:run` in `frontend/`.

**End-to-end manual check:**
- Run the backend (`npm run start:dev`) and frontend (`npm run dev`).
- Open a lineup with DevTools throttled to "Slow 4G": the skeletons show, then
  the content appears with no layout jump.
- Add, remove or swap a player: the insights card skeleton flashes, then shows
  updated badges.
- Compare the `LoggingInterceptor` timings for `/view-lineup` and
  `/lineup-insights` on a cold load versus a second load. The second should
  drop to roughly the cost of the roster query alone.
- `curl -X POST -H "x-admin-token: …" localhost:8080/admin/cache/flush`
  returns `{ flushed: n }`, and the next load is cold again.
- Landing page Network tab: one `/view-lineup` per saved lineup, and zero
  `/view-player` calls.

## Future work
- `RedisCacheStore` implementing `CacheStore` (a Railway Redis add-on),
  selected by `CACHE_DRIVER=redis`. Adopt it when running more than one
  instance, or if cold loads after deploys become noticeable.
- Optionally warm the cache on boot for the common case (2025, default Sleeper
  scoring, all positions).
