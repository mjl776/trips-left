export type Player = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
};

export type ViewPlayerQuery = {
  playerId: string;
  season: string;
  leagueId?: string;
  includePostseason?: string;
};

export type PlayerSeasonOverview = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
  season: number;
  gamesPlayed: number;
  totalPoints: number;
  positionRank: number | null;
  positionPlayerCount: number;
};

// Advanced/opportunity metrics rankable via /player-stat-rank. Each maps to a
// raw player_stats column rather than a fantasy-points formula, so ranking
// doesn't depend on any league's scoring settings.
export const RANKABLE_STATS = [
  'passingAirYards',
  'receivingAirYards',
  'targetShare',
  'wopr',
  'passingCpoe',
] as const;

export type RankableStat = (typeof RANKABLE_STATS)[number];

export type PlayerStatRankQuery = {
  playerId: string;
  season: string;
  stat: string;
  includePostseason?: string;
};

export type PlayerStatRank = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
  season: number;
  stat: RankableStat;
  value: number | null;
  gamesCounted: number;
  positionRank: number | null;
  positionPlayerCount: number;
};
