import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectionsService } from './projections.service';
import { PrismaService } from '../prisma.service';
import { PositionStatsService } from '../stats/position-stats.service';
import {
  createMockPrismaService,
  dec,
  MockPrismaService,
} from '../test/prisma-mock';
import { DEFAULT_SCORING_SETTINGS } from '../league/league.models';

// Shape of a Prisma `playerStats.groupBy` row for a single column.
function groupByRow(playerId: string, column: string, value: number) {
  return {
    playerId,
    _sum: { [column]: dec(value) },
    _avg: { [column]: dec(value) },
    _count: { [column]: 1 },
  };
}

function projectionRow(overrides: Record<string, unknown>) {
  return {
    playerId: 'p1',
    player: { fullName: 'Player One', position: 'RB', team: 'X' },
    source: 'mock',
    passYd: null,
    passTd: null,
    passInt: null,
    pass2pt: null,
    rushYd: null,
    rushTd: null,
    rush2pt: null,
    rec: null,
    recYd: null,
    recTd: null,
    rec2pt: null,
    fumLost: null,
    fgMade: null,
    fgMiss: null,
    xpMade: null,
    defSack: null,
    defInt: null,
    defFumRec: null,
    defTd: null,
    defSafety: null,
    defPaAllow: null,
    floor: null,
    ceiling: null,
    stdDev: null,
    projPoints: null,
    ...overrides,
  };
}

// realizedToStatLine + EPA fields used by findDarkHorse.
function statsRow(overrides: Record<string, unknown>) {
  return {
    playerId: 'p1',
    passYd: null,
    passTd: null,
    rushYd: null,
    rushTd: null,
    rec: null,
    recYd: null,
    recTd: null,
    defSack: null,
    defInt: null,
    defFumRec: null,
    defTd: null,
    defSafety: null,
    defPaAllow: null,
    fgMade0_19: null,
    fgMade20_29: null,
    fgMade30_39: null,
    fgMade40_49: null,
    fgMade50_59: null,
    fgMade60p: null,
    fgMiss: null,
    xpMade: null,
    xpMiss: null,
    passing_epa: null,
    rushing_epa: null,
    receiving_epa: null,
    ...overrides,
  };
}

describe('ProjectionsService', () => {
  let service: ProjectionsService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectionsService,
        PositionStatsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProjectionsService);
  });

  describe('getProjections', () => {
    it('throws NotFoundException when the league does not exist', async () => {
      prisma.league.findUnique.mockResolvedValue(null);

      await expect(
        service.getProjections({ leagueId: 'l1', season: '2025', week: '1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('computes points from the stat line when present, and sorts descending', async () => {
      prisma.league.findUnique.mockResolvedValue({
        scoringSettings: DEFAULT_SCORING_SETTINGS,
      });
      prisma.projection.findMany.mockResolvedValue([
        projectionRow({ playerId: 'low', rushYd: dec(10) }), // 1 pt
        projectionRow({ playerId: 'high', rushYd: dec(100), rushTd: dec(1) }), // 16 pts
      ]);

      const result = await service.getProjections({
        leagueId: 'l1',
        season: '2025',
        week: '1',
      });

      expect(prisma.projection.findMany).toHaveBeenCalledWith({
        where: { season: 2025, week: 1, source: undefined, player: undefined },
        include: { player: true },
      });
      expect(result.map((p) => p.playerId)).toEqual(['high', 'low']);
      expect(result[0].projectedPoints).toBe(16);
    });

    it('falls back to projPoints when there is no stat line', async () => {
      prisma.league.findUnique.mockResolvedValue({
        scoringSettings: DEFAULT_SCORING_SETTINGS,
      });
      prisma.projection.findMany.mockResolvedValue([
        projectionRow({ playerId: 'p1', projPoints: dec(12.5) }),
      ]);

      const result = await service.getProjections({
        leagueId: 'l1',
        season: '2025',
        week: '1',
      });

      expect(result[0].projectedPoints).toBe(12.5);
    });

    it('filters by position when provided', async () => {
      prisma.league.findUnique.mockResolvedValue({
        scoringSettings: DEFAULT_SCORING_SETTINGS,
      });
      prisma.projection.findMany.mockResolvedValue([]);

      await service.getProjections({
        leagueId: 'l1',
        season: '2025',
        week: '1',
        position: 'RB',
        source: 'mock',
      });

      expect(prisma.projection.findMany).toHaveBeenCalledWith({
        where: {
          season: 2025,
          week: 1,
          source: 'mock',
          player: { position: 'RB' },
        },
        include: { player: true },
      });
    });
  });

  describe('getLineupInsights', () => {
    it('throws NotFoundException when the roster does not exist', async () => {
      prisma.roster.findUnique.mockResolvedValue(null);

      await expect(
        service.getLineupInsights({
          rosterId: 'r1',
          leagueId: 'l1',
          season: '2025',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('picks a best player and skips worst/dark horse when there is only one candidate', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [
          {
            playerId: 'p1',
            player: {
              playerId: 'p1',
              fullName: 'Solo',
              position: 'RB',
              team: 'X',
            },
          },
        ],
        league: { scoringSettings: DEFAULT_SCORING_SETTINGS },
      });
      prisma.playerStats.findMany.mockResolvedValue([
        statsRow({ playerId: 'p1', rushYd: dec(100), rushTd: dec(1) }),
      ]);

      const result = await service.getLineupInsights({
        rosterId: 'r1',
        leagueId: 'l1',
        season: '2025',
      });

      expect(result.bestPlayer?.playerId).toBe('p1');
      expect(result.worstPlayer).toBeNull();
      expect(result.darkHorse).toBeNull();
    });

    it('excludes K/DEF from worst player and surfaces a dark horse over the league EPA threshold', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [
          {
            playerId: 'rb1',
            player: {
              playerId: 'rb1',
              fullName: 'Best RB',
              position: 'RB',
              team: 'X',
            },
          },
          {
            playerId: 'wr1',
            player: {
              playerId: 'wr1',
              fullName: 'Dark Horse WR',
              position: 'WR',
              team: 'X',
            },
          },
          {
            playerId: 'def1',
            player: {
              playerId: 'def1',
              fullName: 'Some DEF',
              position: 'DEF',
              team: 'X',
            },
          },
        ],
        league: { scoringSettings: DEFAULT_SCORING_SETTINGS },
      });

      // Roster players' own realized stats (unchanged — filtered to the roster's own playerIds).
      prisma.playerStats.findMany.mockResolvedValue([
        statsRow({ playerId: 'rb1', rushYd: dec(100), rushTd: dec(1) }), // 16 pts
        statsRow({
          playerId: 'wr1',
          rec: dec(5),
          recYd: dec(50),
          receiving_epa: dec(10),
        }), // 10 pts
      ]);

      // League-wide distribution for the dark-horse candidate's position/stat,
      // now pushed into SQL via groupBy instead of a full-table findMany.
      prisma.playerStats.groupBy.mockImplementation(({ where }) => {
        if (where.player.position === 'WR') {
          return Promise.resolve([
            groupByRow('wr1', 'receiving_epa', 10),
            groupByRow('other1', 'receiving_epa', 5),
            groupByRow('other2', 'receiving_epa', 3),
            groupByRow('other3', 'receiving_epa', 2),
            groupByRow('other4', 'receiving_epa', 1),
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getLineupInsights({
        rosterId: 'r1',
        leagueId: 'l1',
        season: '2025',
      });

      expect(result.bestPlayer?.playerId).toBe('rb1');
      expect(result.worstPlayer?.playerId).toBe('wr1');
      expect(result.darkHorse).toEqual({
        playerId: 'wr1',
        fullName: 'Dark Horse WR',
        position: 'WR',
        team: 'X',
        stat: 'receiving_epa',
        value: 10,
        leagueThreshold: 10,
        positionRank: 1,
        positionPlayerCount: 5,
        percentile: 100,
      });
    });
  });
});
