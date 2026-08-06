export type League = {
  leagueId: string;
  name: string | null;
  season: number;
  rosterPositions: string[];
  numTeams: number | null;
  isMock: boolean;
};
