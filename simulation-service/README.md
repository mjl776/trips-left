## Overview

A small, stateless [FastAPI](https://fastapi.tiangolo.com) service that runs a Monte Carlo trade simulation given two players' raw weekly fantasy-point samples. It has no database access and no credentials — the NestJS backend (`backend/src/trade`) is the only caller. See [CLAUDE.md](./CLAUDE.md) for the full spec and conventions.

## Endpoint

`POST /simulate-trade`

Request:
```jsonc
{
  "player_out": { "player_id": "string", "weekly_points": [10.0, 12.0, 8.0] },
  "player_in":  { "player_id": "string", "weekly_points": [20.0, 22.0, 18.0] },
  "trials": 10000,
  "horizon_weeks": null // defaults to whichever side has more games played
}
```

Response:
```jsonc
{
  "expected_delta": 76.8,
  "win_probability": 92.4,
  "percentiles": { "p10": 40.0, "p50": 78.0, "p90": 110.0 }
}
```

[`main.py`](./main.py) is the thin FastAPI layer around `simulate_trade` — it owns request/response shape and one piece of default-value logic, nothing else:

1. Parses the request body into `SimulateTradeRequest` (Pydantic validates types — e.g. `weekly_points` must be a list of floats — and rejects malformed requests with a `422` automatically, no manual validation code needed).
2. If `horizon_weeks` wasn't provided (`null`/omitted), computes it as `max(len(player_out.weekly_points), len(player_in.weekly_points))` — project forward as many weeks as whichever player has the longer track record.
3. Calls `simulate_trade(player_out_points, player_in_points, trials, horizon_weeks)` — all the actual Monte Carlo logic lives there, not in the route handler.
4. Wraps the returned dict in a `SimulateTradeResponse` and returns it as JSON.

The endpoint does no database access, no auth, and no cross-request state — every call is fully self-contained, matching the service's stateless design (see [CLAUDE.md](./CLAUDE.md)).

## Functions

### `simulate_trade`

[`simulation.py`](./simulation.py)'s `simulate_trade` is the pure-numpy core of the service (unit-testable without FastAPI). Given both players' `weekly_points` arrays, a trial count, and a `horizon_weeks`:

1. If both players have zero realized weekly points, skip sampling entirely and return the neutral fallback (see below) — there's nothing to differentiate the two sides.
2. Otherwise, for each side independently: if that player's `weekly_points` is empty, treat every trial's draw as `0.0` (a rookie/no-data player is a legitimate input, not an error). Otherwise, draw `horizon_weeks` samples **with replacement** from that player's own `weekly_points` via `np.random.choice`, for all `trials` at once (`shape (trials, horizon_weeks)`), then sum each trial's draws into a season total (`shape (trials,)`). This is fully vectorized — no Python-level loop over trials.
3. `delta = player_in_totals - player_out_totals`, elementwise across all trials.
4. Reduce `delta` down to the three summary stats returned to the caller: `expected_delta` (mean), `win_probability` (% of trials where `delta > 0`), and `percentiles` (p10/p50/p90).

## What the numbers mean

The simulation runs `trials` independent draws (10,000 by default). In each trial, both players' season totals are resampled **with replacement** from their own realized weekly point totals ("bootstrap") — not fit to a parametric distribution, since 10-18 games per player is too few samples to assume normality. See "Why bootstrap resampling" in [CLAUDE.md](./CLAUDE.md) for the reasoning.

- **`delta`** (per trial) = `player_in`'s simulated season total − `player_out`'s simulated season total.
- **`expected_delta`** = mean of `delta` across all trials — the average point swing you'd expect from making this trade.
- **`win_probability`** = the percentage of trials where `delta > 0`, i.e. `P(player_in outscores player_out)`. It's not a single-estimate judgment of "who's better" — it's "across many resampled versions of these players' own past performances, in what fraction of those futures does this trade pay off?" Two similarly-productive players land near 50%; a lopsided trade approaches 100% (or 0%). A player with zero realized games always draws `0.0`, so trading for/away a no-data player skews the result toward whichever side has real production.
- **`percentiles`** = p10/p50/p90 of the `delta` distribution — the uncertainty band around `expected_delta`, not just a single number.

If both players have zero realized weekly points, the service skips sampling and returns a neutral result (`win_probability: 50.0`, all deltas `0.0`) since there's nothing to differentiate the two sides.

## Running locally

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Requires Python 3.10+ (the request model uses `int | None` union syntax). NestJS reaches this via `SIMULATION_SERVICE_URL` (e.g. `http://localhost:8001` in dev). No auth for v1 — it's only reachable from the backend, not exposed to the frontend/browser directly.

## Testing

```bash
source venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

Covers: identical inputs on both sides (~50% win probability), a strictly higher-scoring side (>90% win probability, positive expected delta), and the all-zero fallback when both sides have no data.

## CI/CD

Every pull request targeting `main` runs [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) on GitHub Actions. The `simulation-service` job only runs when a PR touches files under this directory — a shared `changes` job path-filters the three service jobs, so a PR that only changes `frontend/` or `backend/` skips this one entirely (shows as "skipped," not "failed").

The job:
1. Sets up Python 3.11 (matching the [Dockerfile](./Dockerfile)'s `python:3.11-slim`).
2. `pip install -r requirements-dev.txt` — installs `requirements.txt` plus `pytest`, which isn't needed in the production image so it's kept out of `requirements.txt` itself.
3. `python -m pytest tests/ -v`.

No secrets or external services are needed — this service is stateless (see [CLAUDE.md](./CLAUDE.md)), so the job only ever exercises the pure-numpy `simulate_trade` function. See [documentation/ci-cd-pipeline-plan.md](../documentation/ci-cd-pipeline-plan.md) for the full pipeline design and rollout notes.
