export type DarkHorsePlayer = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
  stat: EpaStat;
  value: number;
  leagueThreshold: number;
  positionRank: number | null;
  positionPlayerCount: number;
  percentile: number | null;
};
export type EpaStat = 'passing_epa' | 'rushing_epa' | 'receiving_epa';

export type LineupInsights = {
  rosterId: string;
  leagueId: string;
  season: number;
  bestPlayer: RosterPlayerScore | null;
  worstPlayer: RosterPlayerScore | null;
  darkHorse: DarkHorsePlayer | null;
};

export type RosterPlayerScore = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
  totalPoints: number;
};

// Mirrors RANKABLE_STATS / PlayerStatRank in backend/src/player/player.models.ts
export type RankableStat = "passingAirYards" | "receivingAirYards" | "targetShare" | "wopr" | "passingCpoe";

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
