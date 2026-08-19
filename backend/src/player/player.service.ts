import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import {
  DEFAULT_SCORING_SETTINGS,
  ScoringSettings,
} from '../league/league.models';
import {
  PositionStatsService,
  StatAggregation,
} from '../stats/position-stats.service';

// passingAirYards/receivingAirYards are counting stats (accumulate across a
// season, like passYd); targetShare/wopr/passingCpoe are already per-game
// rates, so they're averaged instead of summed.
const STAT_COLUMN_CONFIG: Record<
  RankableStat,
  { aggregation: StatAggregation }
> = {
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly positionStats: PositionStatsService,
  ) {}

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

    const distribution = await this.positionStats.getFantasyPointsDistribution(
      player.position,
      seasonNum,
      scoringSettings,
      includePostseason === 'true',
    );

    const rankIndex = distribution.findIndex(
      (entry) => entry.playerId === playerId,
    );
    const entry = rankIndex === -1 ? null : distribution[rankIndex];

    return {
      playerId: player.playerId,
      fullName: player.fullName,
      position: player.position,
      team: player.team,
      season: seasonNum,
      gamesPlayed: entry?.gamesPlayed ?? 0,
      totalPoints: entry?.value ?? 0,
      positionRank: rankIndex === -1 ? null : rankIndex + 1,
      positionPlayerCount: distribution.length,
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
    const { aggregation } = STAT_COLUMN_CONFIG[stat];

    const distribution = await this.positionStats.getColumnDistribution(
      player.position,
      stat,
      aggregation,
      seasonNum,
      includePostseason === 'true',
    );

    const rankIndex = distribution.findIndex(
      (entry) => entry.playerId === playerId,
    );
    const entry = rankIndex === -1 ? null : distribution[rankIndex];

    return {
      playerId: player.playerId,
      fullName: player.fullName,
      position: player.position,
      team: player.team,
      season: seasonNum,
      stat,
      value: entry?.value ?? null,
      gamesCounted: entry?.gamesCounted ?? 0,
      positionRank: rankIndex === -1 ? null : rankIndex + 1,
      positionPlayerCount: distribution.length,
    };
  }

  private async getScoringSettings(
    leagueId?: string,
  ): Promise<ScoringSettings> {
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
