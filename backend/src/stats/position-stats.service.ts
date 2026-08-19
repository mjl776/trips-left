import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { ScoringSettings } from '../league/league.models';
import {
  calculateFantasyPoints,
  realizedToStatLine,
} from '../projections/scoring';

// nflverse's player_stats includes the real NFL postseason (weeks 19-22),
// which fantasy leagues don't score. Excluded by default.
const REGULAR_SEASON_WEEKS = 18;

export type StatAggregation = 'sum' | 'avg';

// Columns aggregatable with a single SQL SUM/AVG. Fantasy points are
// deliberately excluded here — that's a per-league weighted formula across
// ~20 columns (calculateFantasyPoints), not reducible to one column, so it's
// computed via getFantasyPointsDistribution instead.
export type AggregatableColumn =
  | 'passingAirYards'
  | 'receivingAirYards'
  | 'targetShare'
  | 'wopr'
  | 'passingCpoe'
  | 'passing_epa'
  | 'rushing_epa'
  | 'receiving_epa';

export type ColumnDistributionEntry = {
  playerId: string;
  value: number;
  gamesCounted: number;
};
export type PointsDistributionEntry = {
  playerId: string;
  value: number;
  gamesPlayed: number;
};

// Only the raw columns calculateFantasyPoints/realizedToStatLine read — trims
// the advanced-metric/opportunity columns PlayerStats also carries (EPA,
// target share, air yards, etc.) that scoring never touches.
const SCORING_STAT_SELECT = {
  playerId: true,
  passYd: true,
  passTd: true,
  rushYd: true,
  rushTd: true,
  rec: true,
  recYd: true,
  recTd: true,
  defSack: true,
  defInt: true,
  defFumRec: true,
  defTd: true,
  defSafety: true,
  defPaAllow: true,
  fgMade0_19: true,
  fgMade20_29: true,
  fgMade30_39: true,
  fgMade40_49: true,
  fgMade50_59: true,
  fgMade60p: true,
  fgMiss: true,
  xpMade: true,
  xpMiss: true,
} satisfies Prisma.PlayerStatsSelect;

// Shared by player.service.ts, projections.service.ts, and lineup.service.ts,
// which each independently ranked a player against everyone else at their
// position for a season — previously by fetching every stat row for the
// position and reducing in Node, once per call.
@Injectable()
export class PositionStatsService {
  constructor(private readonly prisma: PrismaService) {}

  // League-wide sum/avg of a single PlayerStats column for a position+season,
  // best-to-worst. Pushes the aggregation into SQL via Prisma groupBy instead
  // of fetching every row for the position and reducing in Node.
  async getColumnDistribution(
    position: string,
    column: AggregatableColumn,
    aggregation: StatAggregation,
    season: number,
    includePostseason = false,
  ): Promise<ColumnDistributionEntry[]> {
    const week = includePostseason ? undefined : { lte: REGULAR_SEASON_WEEKS };
    const aggregateSelector = {
      [column]: true,
    } as Prisma.PlayerStatsSumAggregateInputType &
      Prisma.PlayerStatsAvgAggregateInputType &
      Prisma.PlayerStatsCountAggregateInputType;

    const rows = await this.prisma.playerStats.groupBy({
      by: ['playerId'],
      where: { season, week, player: { position } },
      _sum: aggregateSelector,
      _avg: aggregateSelector,
      _count: aggregateSelector,
    });

    return rows
      .map((row) => {
        const aggregate = (
          aggregation === 'sum' ? row._sum : row._avg
        ) as Record<string, Prisma.Decimal | number | null> | null;
        const raw = aggregate?.[column];
        if (raw == null) return null;
        const gamesCounted = (row._count as Record<string, number>)[column];
        const value = typeof raw === 'number' ? raw : raw.toNumber();
        return { playerId: row.playerId, value, gamesCounted };
      })
      .filter((entry): entry is ColumnDistributionEntry => entry !== null)
      .sort((a, b) => b.value - a.value);
  }

  // League-wide fantasy-points total for a position+season, best-to-worst.
  // totalPoints is a per-league weighted formula across many columns
  // (calculateFantasyPoints), so it can't be pushed into a single SQL SUM —
  // this fetches each position's rows once and reduces in Node, but the
  // caller is expected to call it once per *position*, not once per player.
  async getFantasyPointsDistribution(
    position: string,
    season: number,
    scoringSettings: ScoringSettings,
    includePostseason = false,
  ): Promise<PointsDistributionEntry[]> {
    const week = includePostseason ? undefined : { lte: REGULAR_SEASON_WEEKS };
    const rows = await this.prisma.playerStats.findMany({
      where: { season, week, player: { position } },
      select: SCORING_STAT_SELECT,
    });

    const totalsByPlayer = new Map<string, number>();
    const gamesByPlayer = new Map<string, number>();
    for (const row of rows) {
      const points = calculateFantasyPoints(
        realizedToStatLine(row),
        scoringSettings,
      );
      totalsByPlayer.set(
        row.playerId,
        (totalsByPlayer.get(row.playerId) ?? 0) + points,
      );
      gamesByPlayer.set(
        row.playerId,
        (gamesByPlayer.get(row.playerId) ?? 0) + 1,
      );
    }

    return [...totalsByPlayer.entries()]
      .map(([playerId, value]) => ({
        playerId,
        value,
        gamesPlayed: gamesByPlayer.get(playerId) ?? 0,
      }))
      .sort((a, b) => b.value - a.value);
  }
}
