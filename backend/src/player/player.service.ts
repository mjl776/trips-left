import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  Player,
  PlayerSeasonOverview,
  PlayerStatRank,
  PlayerStatRankQuery,
  RANKABLE_STATS,
  RankableStat,
  ViewPlayerQuery,
} from './player.models';
import { DEFAULT_SCORING_SETTINGS, ScoringSettings } from '../league/league.models';
import { calculateFantasyPoints, realizedToStatLine } from '../projections/scoring';

// nflverse's player_stats includes the real NFL postseason (weeks 19-22),
// which fantasy leagues don't score. Excluded by default.
const REGULAR_SEASON_WEEKS = 18;

type StatAggregation = 'sum' | 'avg';

// passingAirYards/receivingAirYards are counting stats (accumulate across a
// season, like passYd); targetShare/wopr/passingCpoe are already per-game
// rates, so they're averaged instead of summed.
const STAT_COLUMN_CONFIG: Record<RankableStat, { aggregation: StatAggregation }> = {
  passingAirYards: { aggregation: 'sum' },
  receivingAirYards: { aggregation: 'sum' },
  targetShare: { aggregation: 'avg' },
  wopr: { aggregation: 'avg' },
  passingCpoe: { aggregation: 'avg' },
};

function isRankableStat(value: string): value is RankableStat {
  return (RANKABLE_STATS as readonly string[]).includes(value);
}

@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlayers(): Promise<Player[]> {
    return this.prisma.player.findMany({
      select: {
        playerId: true,
        fullName: true,
        position: true,
        team: true,
      },
    });
  }

  async viewPlayer({
    playerId,
    season,
    leagueId,
    includePostseason,
  }: ViewPlayerQuery): Promise<PlayerSeasonOverview> {
    const player = await this.prisma.player.findUnique({ where: { playerId } });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    const scoringSettings = await this.getScoringSettings(leagueId);
    const seasonNum = Number(season);
    const weekFilter =
      includePostseason === 'true' ? undefined : { lte: REGULAR_SEASON_WEEKS };

    const stats = await this.prisma.playerStats.findMany({
      where: {
        season: seasonNum,
        week: weekFilter,
        player: { position: player.position },
      },
    });

    const totalsByPlayer = new Map<string, number>();
    const gamesByPlayer = new Map<string, number>();
    for (const stat of stats) {
      const points = calculateFantasyPoints(realizedToStatLine(stat), scoringSettings);
      totalsByPlayer.set(stat.playerId, (totalsByPlayer.get(stat.playerId) ?? 0) + points);
      gamesByPlayer.set(stat.playerId, (gamesByPlayer.get(stat.playerId) ?? 0) + 1);
    }

    const ranked = [...totalsByPlayer.entries()].sort((a, b) => b[1] - a[1]);
    const rankIndex = ranked.findIndex(([id]) => id === playerId);

    return {
      playerId: player.playerId,
      fullName: player.fullName,
      position: player.position,
      team: player.team,
      season: seasonNum,
      gamesPlayed: gamesByPlayer.get(playerId) ?? 0,
      totalPoints: totalsByPlayer.get(playerId) ?? 0,
      positionRank: rankIndex === -1 ? null : rankIndex + 1,
      positionPlayerCount: ranked.length,
    };
  }

  async getPlayerStatRank({
    playerId,
    season,
    stat,
    includePostseason,
  }: PlayerStatRankQuery): Promise<PlayerStatRank> {
    if (!isRankableStat(stat)) {
      throw new BadRequestException(
        `Unsupported stat "${stat}". Supported: ${RANKABLE_STATS.join(', ')}`,
      );
    }

    const player = await this.prisma.player.findUnique({ where: { playerId } });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    const seasonNum = Number(season);
    const weekFilter =
      includePostseason === 'true' ? undefined : { lte: REGULAR_SEASON_WEEKS };

    const rows = await this.prisma.playerStats.findMany({
      where: {
        season: seasonNum,
        week: weekFilter,
        player: { position: player.position },
      },
    });

    const valuesByPlayer = new Map<string, number[]>();
    for (const row of rows) {
      const raw = row[stat];
      if (raw == null) continue;
      const values = valuesByPlayer.get(row.playerId) ?? [];
      values.push(raw.toNumber());
      valuesByPlayer.set(row.playerId, values);
    }

    const { aggregation } = STAT_COLUMN_CONFIG[stat];
    const aggregatedByPlayer = new Map<string, number>();
    for (const [pid, values] of valuesByPlayer) {
      const total = values.reduce((sum, v) => sum + v, 0);
      aggregatedByPlayer.set(pid, aggregation === 'avg' ? total / values.length : total);
    }

    const ranked = [...aggregatedByPlayer.entries()].sort((a, b) => b[1] - a[1]);
    const rankIndex = ranked.findIndex(([id]) => id === playerId);

    return {
      playerId: player.playerId,
      fullName: player.fullName,
      position: player.position,
      team: player.team,
      season: seasonNum,
      stat,
      value: aggregatedByPlayer.get(playerId) ?? null,
      gamesCounted: valuesByPlayer.get(playerId)?.length ?? 0,
      positionRank: rankIndex === -1 ? null : rankIndex + 1,
      positionPlayerCount: ranked.length,
    };
  }

  private async getScoringSettings(leagueId?: string): Promise<ScoringSettings> {
    if (!leagueId) {
      return DEFAULT_SCORING_SETTINGS;
    }
    const league = await this.prisma.league.findUnique({ where: { leagueId } });
    if (!league) {
      throw new NotFoundException(`League ${leagueId} not found`);
    }
    return league.scoringSettings as unknown as ScoringSettings;
  }
}
