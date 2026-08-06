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

// Mirrors RANKABLE_STATS in backend/src/player/player.models.ts
export const RANKABLE_STAT_LABELS: Record<string, string> = {
  passingAirYards: "Passing air yards",
  receivingAirYards: "Receiving air yards",
  targetShare: "Target share",
  wopr: "WOPR",
  passingCpoe: "CPOE",
};

// Which rankable stats are worth showing per position; K/DEF have none.
export const POSITION_RANKABLE_STATS: Record<string, string[]> = {
  QB: ["passingAirYards", "passingCpoe"],
  RB: ["targetShare", "wopr"],
  WR: ["targetShare", "receivingAirYards", "wopr"],
  TE: ["targetShare", "receivingAirYards", "wopr"],
};