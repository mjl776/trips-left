export type ProjectionQuery = {
  leagueId: string;
  season: string;
  week: string;
  position?: string;
  source?: string;
};

export type ProjectedPlayer = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
  projectedPoints: number;
  floor: number | null;
  ceiling: number | null;
  stdDev: number | null;
  source: string;
};

export type LineupInsightsQuery = {
  rosterId: string;
  leagueId: string;
  season: string;
};

export type RosterPlayerScore = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
  totalPoints: number;
};

export type EpaStat = 'passing_epa' | 'rushing_epa' | 'receiving_epa';

export type DarkHorsePlayer = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
  stat: EpaStat;
  value: number;
  leagueThreshold: number;
};

export type LineupInsights = {
  rosterId: string;
  leagueId: string;
  season: number;
  bestPlayer: RosterPlayerScore | null;
  darkHorse: DarkHorsePlayer | null;
};
