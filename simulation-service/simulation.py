import numpy as np


def simulate_trade(
    player_out_points: list[float],
    player_in_points: list[float],
    trials: int,
    horizon_weeks: int,
) -> dict:
    out_arr = np.array(player_out_points, dtype=float)
    in_arr = np.array(player_in_points, dtype=float)

    if out_arr.size == 0 and in_arr.size == 0:
        return {
            "expected_delta": 0.0,
            "win_probability": 50.0,
            "percentiles": {"p10": 0.0, "p50": 0.0, "p90": 0.0},
        }

    if out_arr.size == 0:
        out_totals = np.zeros(trials)
    else:
        out_totals = np.random.choice(out_arr, size=(trials, horizon_weeks)).sum(axis=1)

    if in_arr.size == 0:
        in_totals = np.zeros(trials)
    else:
        in_totals = np.random.choice(in_arr, size=(trials, horizon_weeks)).sum(axis=1)

    delta = in_totals - out_totals

    return {
        "expected_delta": float(delta.mean()),
        "win_probability": float((delta > 0).mean() * 100),
        "percentiles": {
            "p10": float(np.percentile(delta, 10)),
            "p50": float(np.percentile(delta, 50)),
            "p90": float(np.percentile(delta, 90)),
        },
    }
