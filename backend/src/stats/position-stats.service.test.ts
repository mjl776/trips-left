import { Test, TestingModule } from '@nestjs/testing';
import { PositionStatsService } from './position-stats.service';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache/cache.service';
import { CACHE_STORE } from '../cache/cache.models';
import { InMemoryCacheStore } from '../cache/in-memory-cache.store';
import { DEFAULT_SCORING_SETTINGS } from '../league/league.models';
import {
  createMockPrismaService,
  dec,
  MockPrismaService,
} from '../test/prisma-mock';

describe('PositionStatsService', () => {
  let service: PositionStatsService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    delete process.env.STATS_CACHE_ENABLED;
    prisma = createMockPrismaService();
    prisma.playerStats.findMany.mockResolvedValue([
      { playerId: 'wr1', recYd: dec(100), rec: dec(8) },
      { playerId: 'wr2', recYd: dec(40), rec: dec(3) },
    ]);
    prisma.playerStats.groupBy.mockResolvedValue([
      {
        playerId: 'wr1',
        _sum: { receiving_epa: dec(20) },
        _avg: { receiving_epa: dec(2) },
        _count: { receiving_epa: 10 },
      },
    ]);

    // Real CacheService over a fresh in-memory store per test.
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionStatsService,
        CacheService,
        { provide: CACHE_STORE, useValue: new InMemoryCacheStore() },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PositionStatsService);
  });

  describe('getFantasyPointsDistribution', () => {
    it('ranks players best-to-worst', async () => {
      const distribution = await service.getFantasyPointsDistribution(
        'WR',
        2025,
        DEFAULT_SCORING_SETTINGS,
      );
      expect(distribution.map((entry) => entry.playerId)).toEqual([
        'wr1',
        'wr2',
      ]);
    });

    it('serves a repeat call with the same args from cache', async () => {
      const first = await service.getFantasyPointsDistribution(
        'WR',
        2025,
        DEFAULT_SCORING_SETTINGS,
      );
      const second = await service.getFantasyPointsDistribution(
        'WR',
        2025,
        DEFAULT_SCORING_SETTINGS,
      );

      expect(second).toBe(first);
      expect(prisma.playerStats.findMany).toHaveBeenCalledTimes(1);
    });

    it('queries again for different scoring settings', async () => {
      await service.getFantasyPointsDistribution(
        'WR',
        2025,
        DEFAULT_SCORING_SETTINGS,
      );
      await service.getFantasyPointsDistribution('WR', 2025, {
        ...DEFAULT_SCORING_SETTINGS,
        rec: 0,
      });

      expect(prisma.playerStats.findMany).toHaveBeenCalledTimes(2);
    });

    it('treats key-order-shuffled scoring settings as the same entry', async () => {
      const shuffled = Object.fromEntries(
        Object.entries(DEFAULT_SCORING_SETTINGS).reverse(),
      ) as typeof DEFAULT_SCORING_SETTINGS;

      await service.getFantasyPointsDistribution(
        'WR',
        2025,
        DEFAULT_SCORING_SETTINGS,
      );
      await service.getFantasyPointsDistribution('WR', 2025, shuffled);

      expect(prisma.playerStats.findMany).toHaveBeenCalledTimes(1);
    });

    it('keys separately on position, season, and postseason', async () => {
      await service.getFantasyPointsDistribution(
        'WR',
        2025,
        DEFAULT_SCORING_SETTINGS,
      );
      await service.getFantasyPointsDistribution(
        'RB',
        2025,
        DEFAULT_SCORING_SETTINGS,
      );
      await service.getFantasyPointsDistribution(
        'WR',
        2024,
        DEFAULT_SCORING_SETTINGS,
      );
      await service.getFantasyPointsDistribution(
        'WR',
        2025,
        DEFAULT_SCORING_SETTINGS,
        true,
      );

      expect(prisma.playerStats.findMany).toHaveBeenCalledTimes(4);
    });
  });

  describe('getColumnDistribution', () => {
    it('serves a repeat call with the same args from cache', async () => {
      const first = await service.getColumnDistribution(
        'WR',
        'receiving_epa',
        'sum',
        2025,
      );
      const second = await service.getColumnDistribution(
        'WR',
        'receiving_epa',
        'sum',
        2025,
      );

      expect(first).toEqual([{ playerId: 'wr1', value: 20, gamesCounted: 10 }]);
      expect(second).toBe(first);
      expect(prisma.playerStats.groupBy).toHaveBeenCalledTimes(1);
    });

    it('queries again for a different aggregation or column', async () => {
      await service.getColumnDistribution('WR', 'receiving_epa', 'sum', 2025);
      await service.getColumnDistribution('WR', 'receiving_epa', 'avg', 2025);
      await service.getColumnDistribution('WR', 'wopr', 'sum', 2025);

      expect(prisma.playerStats.groupBy).toHaveBeenCalledTimes(3);
    });

    it('shares one query between concurrent identical calls', async () => {
      await Promise.all([
        service.getColumnDistribution('WR', 'receiving_epa', 'sum', 2025),
        service.getColumnDistribution('WR', 'receiving_epa', 'sum', 2025),
      ]);

      expect(prisma.playerStats.groupBy).toHaveBeenCalledTimes(1);
    });
  });
});
