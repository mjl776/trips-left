// Mirrors backend/src/trade/trade.models.ts
export type TradePlayer = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
  value: number;
  efficiency: number | null;
  weeksPlayed: number;
};

export type TradeSimulation = {
  expectedDelta: number;
  winProbability: number;
  percentiles: { p10: number; p50: number; p90: number };
};

export type SimulateTradeResponse = {
  playerOut: TradePlayer;
  playerIn: TradePlayer;
  roi: number | null;
  simulation: TradeSimulation | null;
  error?: string;
};
