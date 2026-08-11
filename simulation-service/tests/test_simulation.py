import numpy as np

from simulation import simulate_trade


def test_identical_inputs_near_50_percent_win_probability():
    np.random.seed(0)
    points = [10.0, 12.0, 8.0, 15.0, 9.0]
    result = simulate_trade(points, points, trials=10_000, horizon_weeks=5)
    assert 45 <= result["win_probability"] <= 55
    assert abs(result["expected_delta"]) < 1.0


def test_higher_scoring_side_has_higher_win_probability_and_positive_delta():
    np.random.seed(0)
    low = [5.0, 6.0, 4.0, 7.0, 5.0]
    high = [20.0, 22.0, 18.0, 25.0, 19.0]
    result = simulate_trade(low, high, trials=10_000, horizon_weeks=5)
    assert result["win_probability"] > 90
    assert result["expected_delta"] > 0


def test_both_sides_empty_returns_neutral_fallback():
    result = simulate_trade([], [], trials=10_000, horizon_weeks=0)
    assert result["expected_delta"] == 0.0
    assert result["win_probability"] == 50.0
    assert result["percentiles"] == {"p10": 0.0, "p50": 0.0, "p90": 0.0}


def test_empty_side_treated_as_always_zero_draw():
    np.random.seed(0)
    result = simulate_trade([], [10.0, 12.0, 8.0], trials=10_000, horizon_weeks=3)
    assert result["win_probability"] > 90
    assert result["expected_delta"] > 0
