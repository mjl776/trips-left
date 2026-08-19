import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PrismaService } from '../prisma.service';
import { PositionStatsService } from '../stats/position-stats.service';
import {
  createMockPrismaService,
  dec,
  MockPrismaService,
} from '../test/prisma-mock';
import { DEFAULT_SCORING_SETTINGS } from '../league/league.models';

// Fills in the RealizedStatLine fields realizedToStatLine() reads, plus the
// playerId/season/week columns the service groups by. Pass only what a test cares about.
function statRow(overrides: Record<string, unknown>) {
  return {
    playerId: 'p1',
    season: 2025,
    week: 1,
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
    ...overrides,
  };
}

// Shape of a Prisma `playerStats.groupBy` row for a single rankable column.
function groupByRow(
  playerId: string,
  column: string,
  sum: number,
  avg: number,
  count: number,
) {
  return {
    playerId,
    _sum: { [column]: dec(sum) },
    _avg: { [column]: dec(avg) },
    _count: { [column]: count },
  };
}

describe('PlayerService', () => {
  let service: PlayerService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        PositionStatsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PlayerService);
  });

  describe('getPlayers', () => {
    it('returns the player list', async () => {
      const players = [
        { playerId: 'p1', fullName: 'A', position: 'QB', team: 'X' },
      ];
      prisma.player.findMany.mockResolvedValue(players);

      const result = await service.getPlayers();

      expect(prisma.player.findMany).toHaveBeenCalledWith({
        select: { playerId: true, fullName: true, position: true, team: true },
      });
      expect(result).toBe(players);
    });
  });

  describe('viewPlayer', () => {
    it('throws NotFoundException when the player does not exist', async () => {
      prisma.player.findUnique.mockResolvedValue(null);

      await expect(
        service.viewPlayer({ playerId: 'p1', season: '2025' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the given league does not exist', async () => {
      prisma.player.findUnique.mockResolvedValue({
        playerId: 'p1',
        position: 'QB',
      });
      prisma.league.findUnique.mockResolvedValue(null);

      await expect(
        service.viewPlayer({
          playerId: 'p1',
          season: '2025',
          leagueId: 'bad-league',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ranks the player against others at the same position using default scoring', async () => {
      prisma.player.findUnique.mockResolvedValue({
        playerId: 'p1',
        fullName: 'Player One',
        position: 'RB',
        team: 'X',
      });
      prisma.playerStats.findMany.mockResolvedValue([
        statRow({ playerId: 'p1', week: 1, rushYd: dec(100), rushTd: dec(1) }), // 16 pts
        statRow({ playerId: 'p1', week: 2, rushYd: dec(50) }), // 5 pts -> total 21, 2 games
        statRow({ playerId: 'p2', week: 1, rushYd: dec(200), rushTd: dec(2) }), // 32 pts
      ]);

      const result = await service.viewPlayer({
        playerId: 'p1',
        season: '2025',
      });

      expect(prisma.league.findUnique).not.toHaveBeenCalled();
      expect(prisma.playerStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            season: 2025,
            week: { lte: 18 },
            player: { position: 'RB' },
          },
        }),
      );
      expect(result).toEqual({
        playerId: 'p1',
        fullName: 'Player One',
        position: 'RB',
        team: 'X',
        season: 2025,
        gamesPlayed: 2,
        totalPoints: 21,
        positionRank: 2,
        positionPlayerCount: 2,
      });
    });

    it('includes postseason weeks when requested', async () => {
      prisma.player.findUnique.mockResolvedValue({
        playerId: 'p1',
        position: 'QB',
      });
      prisma.playerStats.findMany.mockResolvedValue([]);

      await service.viewPlayer({
        playerId: 'p1',
        season: '2025',
        includePostseason: 'true',
      });

      expect(prisma.playerStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { season: 2025, week: undefined, player: { position: 'QB' } },
        }),
      );
    });

    it('uses the league scoring settings when a leagueId is given', async () => {
      prisma.player.findUnique.mockResolvedValue({
        playerId: 'p1',
        position: 'RB',
      });
      prisma.league.findUnique.mockResolvedValue({
        scoringSettings: { ...DEFAULT_SCORING_SETTINGS, rush_yd: 1 },
      });
      prisma.playerStats.findMany.mockResolvedValue([
        statRow({ playerId: 'p1', rushYd: dec(10) }),
      ]);

      const result = await service.viewPlayer({
        playerId: 'p1',
        season: '2025',
        leagueId: 'l1',
      });

      expect(result.totalPoints).toBe(10);
    });
  });

  describe('getPlayerStatRank', () => {
    it('throws BadRequestException for an unsupported stat', async () => {
      await expect(
        service.getPlayerStatRank({
          playerId: 'p1',
          season: '2025',
          stat: 'not_a_stat',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the player does not exist', async () => {
      prisma.player.findUnique.mockResolvedValue(null);

      await expect(
        service.getPlayerStatRank({
          playerId: 'p1',
          season: '2025',
          stat: 'wopr',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sums a counting stat across games and ranks players, pushing the aggregation into SQL via groupBy', async () => {
      prisma.player.findUnique.mockResolvedValue({
        playerId: 'p1',
        fullName: 'Player One',
        position: 'WR',
        team: 'X',
      });
      prisma.playerStats.groupBy.mockResolvedValue([
        groupByRow('p1', 'receivingAirYards', 75, 37.5, 2),
        groupByRow('p2', 'receivingAirYards', 100, 100, 1),
      ]);

      const result = await service.getPlayerStatRank({
        playerId: 'p1',
        season: '2025',
        stat: 'receivingAirYards',
      });

      expect(prisma.playerStats.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['playerId'],
          where: {
            season: 2025,
            week: { lte: 18 },
            player: { position: 'WR' },
          },
        }),
      );
      expect(result).toEqual({
        playerId: 'p1',
        fullName: 'Player One',
        position: 'WR',
        team: 'X',
        season: 2025,
        stat: 'receivingAirYards',
        value: 75,
        gamesCounted: 2,
        positionRank: 2,
        positionPlayerCount: 2,
      });
    });

    it('averages a rate stat instead of summing it', async () => {
      prisma.player.findUnique.mockResolvedValue({
        playerId: 'p1',
        fullName: 'Player One',
        position: 'WR',
        team: 'X',
      });
      prisma.playerStats.groupBy.mockResolvedValue([
        groupByRow('p1', 'targetShare', 0.6, 0.3, 2),
      ]);

      const result = await service.getPlayerStatRank({
        playerId: 'p1',
        season: '2025',
        stat: 'targetShare',
      });

      expect(result.value).toBeCloseTo(0.3);
      expect(result.gamesCounted).toBe(2);
    });

    it('returns a null value and rank when the player has no rows for the stat', async () => {
      prisma.player.findUnique.mockResolvedValue({
        playerId: 'p1',
        fullName: 'Player One',
        position: 'WR',
        team: 'X',
      });
      prisma.playerStats.groupBy.mockResolvedValue([
        groupByRow('p2', 'wopr', 0.5, 0.5, 1),
      ]);

      const result = await service.getPlayerStatRank({
        playerId: 'p1',
        season: '2025',
        stat: 'wopr',
      });

      expect(result.value).toBeNull();
      expect(result.gamesCounted).toBe(0);
      expect(result.positionRank).toBeNull();
      expect(result.positionPlayerCount).toBe(1);
    });
  });
});
