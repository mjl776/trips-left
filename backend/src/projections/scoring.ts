import { ScoringSettings } from '../league/league.models';

export type StatLine = {
  passYd?: number | null;
  passTd?: number | null;
  passInt?: number | null;
  pass2pt?: number | null;
  rushYd?: number | null;
  rushTd?: number | null;
  rush2pt?: number | null;
  rec?: number | null;
  recYd?: number | null;
  recTd?: number | null;
  rec2pt?: number | null;
  fumLost?: number | null;
  fgMade?: number | null;
  fgMiss?: number | null;
  xpMade?: number | null;
  defSack?: number | null;
  defInt?: number | null;
  defFumRec?: number | null;
  defTd?: number | null;
  defSafety?: number | null;
  defPaAllow?: number | null;
};

// Stat fields that convert 1:1 via a flat per-unit rate in ScoringSettings.
const FLAT_RATE_FIELDS: Array<[keyof StatLine, keyof ScoringSettings]> = [
  ['passYd', 'pass_yd'],
  ['passTd', 'pass_td'],
  ['passInt', 'pass_int'],
  ['pass2pt', 'pass_2pt'],
  ['rushYd', 'rush_yd'],
  ['rushTd', 'rush_td'],
  ['rush2pt', 'rush_2pt'],
  ['rec', 'rec'],
  ['recYd', 'rec_yd'],
  ['recTd', 'rec_td'],
  ['rec2pt', 'rec_2pt'],
  ['fumLost', 'fum_lost'],
  ['xpMade', 'xpm'],
  ['fgMiss', 'fgmiss'],
  ['defSack', 'sack'],
  ['defInt', 'int'],
  ['defFumRec', 'fum_rec'],
  ['defTd', 'def_td'],
  ['defSafety', 'safe'],
];

const FG_MADE_TIER_KEYS: Array<keyof ScoringSettings> = [
  'fgm_0_19',
  'fgm_20_29',
  'fgm_30_39',
  'fgm_40_49',
  'fgm_50_59',
  'fgm_60p',
];

const POINTS_ALLOWED_TIERS: Array<{ max: number; key: keyof ScoringSettings }> = [
  { max: 0, key: 'pts_allow_0' },
  { max: 6, key: 'pts_allow_1_6' },
  { max: 13, key: 'pts_allow_7_13' },
  { max: 20, key: 'pts_allow_14_20' },
  { max: 27, key: 'pts_allow_21_27' },
  { max: 34, key: 'pts_allow_28_34' },
  { max: Infinity, key: 'pts_allow_35p' },
];

export function calculateFantasyPoints(
  stat: StatLine,
  scoring: ScoringSettings,
): number {
  let points = 0;

  for (const [statKey, scoringKey] of FLAT_RATE_FIELDS) {
    const value = stat[statKey];
    const rate = scoring[scoringKey];
    if (value && rate) {
      points += value * rate;
    }
  }

  // fgMade isn't tracked by distance, so the league's per-distance tiers can't be
  // applied exactly here — approximate with the average make rate across tiers.
  if (stat.fgMade) {
    const tierRates = FG_MADE_TIER_KEYS.map((key) => scoring[key]).filter(
      (rate): rate is number => rate != null,
    );
    if (tierRates.length > 0) {
      const avgRate = tierRates.reduce((sum, r) => sum + r, 0) / tierRates.length;
      points += stat.fgMade * avgRate;
    }
  }

  // Points allowed is scored as a single tier lookup, not a per-point rate.
  if (stat.defPaAllow != null) {
    const tier = POINTS_ALLOWED_TIERS.find((t) => stat.defPaAllow! <= t.max);
    const rate = tier ? scoring[tier.key] : undefined;
    if (rate != null) {
      points += rate;
    }
  }

  return points;
}

export function hasStatLine(stat: StatLine): boolean {
  return Object.values(stat).some((value) => value != null);
}

// Duck-typed so this module doesn't need to import Prisma directly.
type DecimalLike = { toNumber(): number };

export function decimalToNumber(value: DecimalLike | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

// player_stats carries these fields (no INT/2pt/fumbles/FG realized data yet)
// — see pull_stats.py's STAT_COLUMNS and build_def_rows.
export type RealizedStatLine = {
  passYd: DecimalLike | null;
  passTd: DecimalLike | null;
  rushYd: DecimalLike | null;
  rushTd: DecimalLike | null;
  rec: DecimalLike | null;
  recYd: DecimalLike | null;
  recTd: DecimalLike | null;
  defSack: DecimalLike | null;
  defInt: DecimalLike | null;
  defFumRec: DecimalLike | null;
  defTd: DecimalLike | null;
  defSafety: DecimalLike | null;
  defPaAllow: DecimalLike | null;
};

export function realizedToStatLine(stat: RealizedStatLine): StatLine {
  return {
    passYd: decimalToNumber(stat.passYd),
    passTd: decimalToNumber(stat.passTd),
    rushYd: decimalToNumber(stat.rushYd),
    rushTd: decimalToNumber(stat.rushTd),
    rec: decimalToNumber(stat.rec),
    recYd: decimalToNumber(stat.recYd),
    recTd: decimalToNumber(stat.recTd),
    defSack: decimalToNumber(stat.defSack),
    defInt: decimalToNumber(stat.defInt),
    defFumRec: decimalToNumber(stat.defFumRec),
    defTd: decimalToNumber(stat.defTd),
    defSafety: decimalToNumber(stat.defSafety),
    defPaAllow: decimalToNumber(stat.defPaAllow),
  };
}
