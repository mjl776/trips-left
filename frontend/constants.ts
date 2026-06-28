// Mirrors the default mock-league rosterPositions in backend/src/league/league.service.ts
export const STARTER_SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF"];
export const BENCH_SLOTS = Array.from({ length: 10 }, () => "BN");

// Mirrors SLOT_ELIGIBILITY in backend/src/lineup/lineup.models.ts
export const SLOT_ELIGIBILITY: Record<string, string[] | null> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  FLEX: ["RB", "WR", "TE"],
  K: ["K"],
  DEF: ["DEF"],
  BN: null,
};