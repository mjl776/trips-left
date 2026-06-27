export type League = {
  leagueId: string;
  name: string | null;
  season: number;
  scoringSettings: ScoringSettings;
  rosterPositions: string[];
  numTeams: number | null;
  isMock: boolean;
};

export type ScoringSettings = {
  // Passing
  pass_yd?: number;
  pass_td?: number;
  pass_int?: number;
  pass_2pt?: number;

  // Rushing
  rush_yd?: number;
  rush_td?: number;
  rush_2pt?: number;

  // Receiving
  rec?: number;
  rec_yd?: number;
  rec_td?: number;
  rec_2pt?: number;

  // Fumbles
  fum?: number;
  fum_lost?: number;
  fum_rec?: number;
  fum_rec_td?: number;
  ff?: number;

  // Defense
  sack?: number;
  int?: number;
  safe?: number;
  def_td?: number;
  blk_kick?: number;

  // Points allowed (tiered by points scored against this team)
  pts_allow_0?: number;
  pts_allow_1_6?: number;
  pts_allow_7_13?: number;
  pts_allow_14_20?: number;
  pts_allow_21_27?: number;
  pts_allow_28_34?: number;
  pts_allow_35p?: number;

  // Field goals (tiered by distance) + extra points
  fgm_0_19?: number;
  fgm_20_29?: number;
  fgm_30_39?: number;
  fgm_40_49?: number;
  fgm_50_59?: number;
  fgm_60p?: number;
  fgmiss?: number;
  xpm?: number;
  xpmiss?: number;

  // Special teams
  st_td?: number;
  st_fum_rec?: number;
  st_ff?: number;
  def_st_td?: number;
  def_st_fum_rec?: number;
  def_st_ff?: number;
};

export type LeagueSettings = Pick<
  League,
  'scoringSettings' | 'rosterPositions'
>;

// Mirrors the scoring settings on Sleeper league defualt settings.
export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  // Passing
  pass_yd: 0.04,
  pass_td: 4,
  pass_int: -1,
  pass_2pt: 2,

  // Rushing
  rush_yd: 0.1,
  rush_td: 6,
  rush_2pt: 2,

  // Receiving
  rec: 1,
  rec_yd: 0.1,
  rec_td: 6,
  rec_2pt: 2,

  // Fumbles
  fum: 0,
  fum_lost: -2,
  fum_rec: 2,
  fum_rec_td: 6,
  ff: 1,

  // Defense
  sack: 1,
  int: 2,
  safe: 2,
  def_td: 6,
  blk_kick: 2,

  // Points allowed (tiered by points scored against this team)
  pts_allow_0: 10,
  pts_allow_1_6: 7,
  pts_allow_7_13: 4,
  pts_allow_14_20: 1,
  pts_allow_21_27: 0,
  pts_allow_28_34: -1,
  pts_allow_35p: -4,

  // Field goals (tiered by distance) + extra points
  fgm_0_19: 3,
  fgm_20_29: 3,
  fgm_30_39: 3,
  fgm_40_49: 4,
  fgm_50_59: 5,
  fgm_60p: 6,
  fgmiss: -1,
  xpm: 1,
  xpmiss: -1,

  // Special teams
  st_td: 6,
  st_fum_rec: 1,
  st_ff: 1,
  def_st_td: 6,
  def_st_fum_rec: 1,
  def_st_ff: 1,
};
