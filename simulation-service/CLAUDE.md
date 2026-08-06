# simulation-service

A small, stateless FastAPI app whose only job is running a Monte Carlo trade
simulation given raw weekly fantasy-point samples. It has **no database
access and no credentials** — all Postgres access stays in the NestJS backend
(`backend/src/trade`), which is the only caller. Keeping this service
DB-free avoids duplicating schema/column knowledge across languages (see the
`STAT_COLUMNS` maintenance burden called out in `backend/ingestions/pull_stats.py`
— don't repeat that mistake here).

## Why bootstrap resampling, not a parametric distribution

There's no real `floor`/`ceiling`/`stdDev` projection data in this app yet
(the `Projection` table is empty — see `backend/src/trade/CLAUDE.md`). What
exists is each player's actual realized weekly fantasy-point totals for a
season (10-18 samples). Rather than fitting/assuming a normal or truncated-normal
distribution from so few points, **resample with replacement directly from
the player's own realized weekly totals** ("bootstrap"). This makes no
distributional assumption and degrades gracefully with sparse data — a player
with 3 games still produces a sane (if wide) distribution.

## Endpoint

`POST /simulate-trade`

Request (Pydantic model):
```python
class PlayerSamples(BaseModel):
    player_id: str
    weekly_points: list[float]  # may be empty

class SimulateTradeRequest(BaseModel):
    player_out: PlayerSamples
    player_in: PlayerSamples
    trials: int = 10_000
    horizon_weeks: int | None = None  # weeks to project; default = len(weekly_points) of whichever side has more games
```

Response:
```python
class SimulateTradeResponse(BaseModel):
    expected_delta: float          # mean(sum(player_in draws) - sum(player_out draws)) across all trials
    win_probability: float         # 0-100, % of trials where player_in total > player_out total
    percentiles: dict[str, float]  # {"p10": ..., "p50": ..., "p90": ...} of the delta distribution
```

## Simulation logic

For each side, if `weekly_points` is empty, treat that player's per-week draw
as always `0.0` (don't error — a rookie/no-data player is a legitimate input,
per the trade module's "not enough data" handling).

Per trial, per side: draw `horizon_weeks` samples **with replacement** from
that player's `weekly_points` array via `numpy.random.choice`, sum them to
get a season total. Vectorize across all `trials` at once with numpy (no
Python-level loop over 10,000 trials) — e.g. `np.random.choice(weekly_points,
size=(trials, horizon_weeks))` then `.sum(axis=1)`.

`delta = player_in_totals - player_out_totals` (elementwise, shape `(trials,)`).

- `expected_delta = float(delta.mean())`
- `win_probability = float((delta > 0).mean() * 100)`
- `percentiles = {"p10": float(np.percentile(delta, 10)), "p50": ..., "p90": ...}`

If both `weekly_points` arrays are empty, skip sampling and return
`expected_delta: 0.0`, `win_probability: 50.0`, all percentiles `0.0` —
there's nothing to differentiate the two sides.

## Project layout

- `main.py` — FastAPI app + the `/simulate-trade` route.
- `simulation.py` — the pure numpy simulation function, unit-testable without FastAPI (`simulate_trade(player_out_points: list[float], player_in_points: list[float], trials: int, horizon_weeks: int) -> dict`).
- `requirements.txt` — `fastapi`, `uvicorn`, `numpy`, `pydantic`. (No `scipy` — bootstrap resampling only needs `numpy`.)
- `tests/test_simulation.py` — at minimum: identical inputs on both sides → `win_probability` ≈ 50; a side with a strictly higher-scoring sample set → `win_probability` > 50 and `expected_delta` > 0; empty arrays on both sides → the all-zero fallback above.

## Running locally

```bash
cd simulation-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

NestJS reaches this via `SIMULATION_SERVICE_URL` (e.g. `http://localhost:8001`
in dev). No auth for v1 — it's only reachable from the backend, not exposed
to the frontend/browser directly.
