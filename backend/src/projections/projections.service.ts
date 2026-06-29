import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ScoringSettings } from '../league/league.models';
import {
  DarkHorsePlayer,
  EpaStat,
  LineupInsights,
  LineupInsightsQuery,
  ProjectedPlayer,
  ProjectionQuery,
  RosterPlayerScore,
} from './projections.models';
import {
  calculateFantasyPoints,
  decimalToNumber,
  hasStatLine,
  realizedToStatLine,
  StatLine,
} from './scoring';
import { Prisma } from '../../generated/prisma/client';

type ProjectionWithPlayer = Prisma.ProjectionGetPayload<{
  include: { player: true };
}>;

// nflverse's player_stats includes the real NFL postseason (weeks 19-22),
// which fantasy leagues don't score. Excluded by default.
const REGULAR_SEASON_WEEKS = 18;

// player_stats has no FG-made/points-allowed columns yet, so K/DEF always
// score 0 via realizedToStatLine() — excluded from "worst player" since that
// 0 reflects a data gap, not an actual bad performance.
const WORST_PLAYER_EXCLUDED_POSITIONS = ['K', 'DEF'];

// One primary EPA stat per position — the only positions an EPA-based dark
// horse makes sense for (kickers/defense have no equivalent column).
const EPA_STAT_BY_POSITION: Record<string, EpaStat> = {
  QB: 'passing_epa',
  RB: 'rushing_epa',
  WR: 'receiving_epa',
  TE: 'receiving_epa',
};

// Top 20% of this position's league-wide EPA distribution for the season.
// Returns Infinity (nobody qualifies) if there's no data to compare against.
async function getLeagueTopPercentileThreshold(
  prisma: PrismaService,
  position: string,
  stat: EpaStat,
  season: number,
): Promise<number> {
  const rows = await prisma.playerStats.findMany({
    where: { season, week: { lte: REGULAR_SEASON_WEEKS }, player: { position } },
  });

  const totalsByPlayer = new Map<string, number>();
  for (const row of rows) {
    const value = decimalToNumber(row[stat]);
    if (value == null) continue;
    totalsByPlayer.set(row.playerId, (totalsByPlayer.get(row.playerId) ?? 0) + value);
  }

  const sorted = [...totalsByPlayer.values()].sort((a, b) => b - a);
  if (sorted.length === 0) {
    return Infinity;
  }
  const cutoffIndex = Math.max(0, Math.ceil(sorted.length * 0.2) - 1);
  return sorted[cutoffIndex];
}

function toNum(value: Prisma.Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

function toStatLine(projection: ProjectionWithPlayer): StatLine {
  return {
    passYd: toNum(projection.passYd),
    passTd: toNum(projection.passTd),
    passInt: toNum(projection.passInt),
    pass2pt: toNum(projection.pass2pt),
    rushYd: toNum(projection.rushYd),
    rushTd: toNum(projection.rushTd),
    rush2pt: toNum(projection.rush2pt),
    rec: toNum(projection.rec),
    recYd: toNum(projection.recYd),
    recTd: toNum(projection.recTd),
    rec2pt: toNum(projection.rec2pt),
    fumLost: toNum(projection.fumLost),
    fgMade: toNum(projection.fgMade),
    fgMiss: toNum(projection.fgMiss),
    xpMade: toNum(projection.xpMade),
    defSack: toNum(projection.defSack),
    defInt: toNum(projection.defInt),
    defFumRec: toNum(projection.defFumRec),
    defTd: toNum(projection.defTd),
    defSafety: toNum(projection.defSafety),
    defPaAllow: toNum(projection.defPaAllow),
  };
}

@Injectable()
export class ProjectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjections({
    leagueId,
    season,
    week,
    position,
    source,
  }: ProjectionQuery): Promise<ProjectedPlayer[]> {
    const league = await this.prisma.league.findUnique({ where: { leagueId } });
    if (!league) {
      throw new NotFoundException(`League ${leagueId} not found`);
    }
    const scoringSettings = league.scoringSettings as unknown as ScoringSettings;

    const projections = await this.prisma.projection.findMany({
      where: {
        season: Number(season),
        week: Number(week),
        source,
        player: position ? { position } : undefined,
      },
      include: { player: true },
    });

    return projections
      .map((projection) => {
        const statLine = toStatLine(projection);
        const projectedPoints = hasStatLine(statLine)
          ? calculateFantasyPoints(statLine, scoringSettings)
          : toNum(projection.projPoints) ?? 0;

        return {
          playerId: projection.playerId,
          fullName: projection.player.fullName,
          position: projection.player.position,
          team: projection.player.team,
          projectedPoints,
          floor: toNum(projection.floor),
          ceiling: toNum(projection.ceiling),
          stdDev: toNum(projection.stdDev),
          source: projection.source,
        };
      })
      .sort((a, b) => b.projectedPoints - a.projectedPoints);
  }

  async getLineupInsights({
    rosterId,
    leagueId,
    season,
  }: LineupInsightsQuery): Promise<LineupInsights> {
    const roster = await this.prisma.roster.findUnique({
      where: { rosterId_leagueId: { rosterId, leagueId } },
      include: {
        rosterPlayers: { include: { player: true } },
        league: true,
      },
    });
    if (!roster) {
      throw new NotFoundException(`Roster ${rosterId} not found`);
    }

    const scoringSettings = roster.league.scoringSettings as unknown as ScoringSettings;
    const seasonNum = Number(season);
    const playerIds = roster.rosterPlayers.map((rp) => rp.playerId);

    const statRows = await this.prisma.playerStats.findMany({
      where: {
        season: seasonNum,
        week: { lte: REGULAR_SEASON_WEEKS },
        playerId: { in: playerIds },
      },
    });

    const statsByPlayer = new Map<string, typeof statRows>();
    for (const row of statRows) {
      const rows = statsByPlayer.get(row.playerId) ?? [];
      rows.push(row);
      statsByPlayer.set(row.playerId, rows);
    }

    const scored: RosterPlayerScore[] = roster.rosterPlayers.map((rp) => {
      const rows = statsByPlayer.get(rp.playerId) ?? [];
      const totalPoints = rows.reduce(
        (sum, row) => sum + calculateFantasyPoints(realizedToStatLine(row), scoringSettings),
        0,
      );
      return {
        playerId: rp.player.playerId,
        fullName: rp.player.fullName,
        position: rp.player.position,
        team: rp.player.team,
        totalPoints,
      };
    });

    scored.sort((a, b) => b.totalPoints - a.totalPoints);
    const bestPlayer = scored[0] ?? null;

    const worstPlayerCandidates = scored.filter(
      (player) => !WORST_PLAYER_EXCLUDED_POSITIONS.includes(player.position),
    );
    const worstPlayer =
      worstPlayerCandidates.length > 1
        ? worstPlayerCandidates[worstPlayerCandidates.length - 1]
        : null;

    const darkHorse = await this.findDarkHorse(
      roster.rosterPlayers,
      statsByPlayer,
      bestPlayer,
      seasonNum,
    );

    return {
      rosterId,
      leagueId,
      season: seasonNum,
      bestPlayer,
      worstPlayer,
      darkHorse,
    };
  }

  private async findDarkHorse(
    rosterPlayers: Array<{
      playerId: string;
      player: { fullName: string; position: string; team: string | null };
    }>,
    statsByPlayer: Map<string, Array<Record<string, unknown>>>,
    bestPlayer: RosterPlayerScore | null,
    season: number,
  ): Promise<DarkHorsePlayer | null> {
    const candidates = rosterPlayers.filter(
      (rp) =>
        rp.playerId !== bestPlayer?.playerId &&
        EPA_STAT_BY_POSITION[rp.player.position] != null,
    );

    const thresholdCache = new Map<string, number>();
    let darkHorse: DarkHorsePlayer | null = null;
    let bestMargin = -Infinity;

    for (const candidate of candidates) {
      const stat = EPA_STAT_BY_POSITION[candidate.player.position];
      const rows = statsByPlayer.get(candidate.playerId) ?? [];
      if (rows.length === 0) continue;

      const value = rows.reduce(
        (sum, row) => sum + (decimalToNumber(row[stat] as Prisma.Decimal | null) ?? 0),
        0,
      );

      const cacheKey = `${candidate.player.position}:${stat}`;
      let threshold = thresholdCache.get(cacheKey);
      if (threshold === undefined) {
        threshold = await getLeagueTopPercentileThreshold(
          this.prisma,
          candidate.player.position,
          stat,
          season,
        );
        thresholdCache.set(cacheKey, threshold);
      }

      const margin = value - threshold;
      if (margin >= 0 && margin > bestMargin) {
        bestMargin = margin;
        darkHorse = {
          playerId: candidate.playerId,
          fullName: candidate.player.fullName,
          position: candidate.player.position,
          team: candidate.player.team,
          stat,
          value,
          leagueThreshold: threshold,
        };
      }
    }

    return darkHorse;
  }
}
