from fastapi import FastAPI
from pydantic import BaseModel

from simulation import simulate_trade

app = FastAPI()


class PlayerSamples(BaseModel):
    player_id: str
    weekly_points: list[float]


class SimulateTradeRequest(BaseModel):
    player_out: PlayerSamples
    player_in: PlayerSamples
    trials: int = 10_000
    horizon_weeks: int | None = None


class SimulateTradeResponse(BaseModel):
    expected_delta: float
    win_probability: float
    percentiles: dict[str, float]


@app.post("/simulate-trade", response_model=SimulateTradeResponse)
def simulate_trade_endpoint(request: SimulateTradeRequest) -> SimulateTradeResponse:
    horizon_weeks = request.horizon_weeks
    if horizon_weeks is None:
        horizon_weeks = max(
            len(request.player_out.weekly_points),
            len(request.player_in.weekly_points),
        )

    result = simulate_trade(
        player_out_points=request.player_out.weekly_points,
        player_in_points=request.player_in.weekly_points,
        trials=request.trials,
        horizon_weeks=horizon_weeks,
    )
    return SimulateTradeResponse(**result)
