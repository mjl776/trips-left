import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeagueService } from './league.service';
import { PrismaService } from '../prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../test/prisma-mock';
import { DEFAULT_SCORING_SETTINGS } from './league.models';

describe('LeagueService', () => {
  let service: LeagueService;
  let prisma: MockPrismaService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LeagueService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(LeagueService);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('postMockLeague', () => {
    it('creates a mock league with default scoring settings', async () => {
      prisma.league.create.mockImplementation(({ data }) =>
        Promise.resolve(data),
      );

      const result = await service.postMockLeague();

      // expect.objectContaining/any/arrayContaining are typed `any` in @types/jest.
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(prisma.league.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leagueId: expect.any(String),
          name: 'Mock League',
          season: 2026,
          scoringSettings: DEFAULT_SCORING_SETTINGS,
          numTeams: 1,
          isMock: true,
          rosterPositions: expect.arrayContaining([
            'QB',
            'RB',
            'WR',
            'TE',
            'FLEX',
            'K',
            'DEF',
            'BN',
          ]),
        }),
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      expect(result.isMock).toBe(true);
      expect(result.scoringSettings).toEqual(DEFAULT_SCORING_SETTINGS);
    });
  });

  describe('importSleeperLeague', () => {
    it('creates a league from a valid Sleeper response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            name: 'Sleeper League',
            season: '2025',
            scoring_settings: { pass_td: 4 },
            roster_positions: ['QB', 'RB', 'BN'],
            total_rosters: 12,
          }),
      });
      prisma.league.create.mockImplementation(({ data }) =>
        Promise.resolve(data),
      );

      const result = await service.importSleeperLeague('sleeper-1');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/sleeper-1',
      );
      expect(prisma.league.create).toHaveBeenCalledWith({
        data: {
          leagueId: 'sleeper-1',
          name: 'Sleeper League',
          season: 2025,
          scoringSettings: { pass_td: 4 },
          rosterPositions: ['QB', 'RB', 'BN'],
          numTeams: 12,
          isMock: false,
        },
      });
      expect(result.season).toBe(2025);
      expect(result.isMock).toBe(false);
    });

    it('throws NotFoundException when the Sleeper request fails', async () => {
      fetchSpy.mockResolvedValue({ ok: false });

      await expect(service.importSleeperLeague('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.league.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when Sleeper returns no data', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      });

      await expect(service.importSleeperLeague('empty')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getLeagueSettings', () => {
    it('returns settings for an existing league', async () => {
      prisma.league.findUnique.mockResolvedValue({
        rosterPositions: ['QB', 'BN'],
        scoringSettings: { pass_td: 4 },
      });

      const result = await service.getLeagueSettings('league-1');

      expect(prisma.league.findUnique).toHaveBeenCalledWith({
        where: { leagueId: 'league-1' },
        select: { rosterPositions: true, scoringSettings: true },
      });
      expect(result).toEqual({
        rosterPositions: ['QB', 'BN'],
        scoringSettings: { pass_td: 4 },
      });
    });

    it('throws NotFoundException when the league does not exist', async () => {
      prisma.league.findUnique.mockResolvedValue(null);

      await expect(service.getLeagueSettings('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('modifyMockLeagueSettings', () => {
    it('is a no-op stub', async () => {
      await expect(
        service.modifyMockLeagueSettings('league-1'),
      ).resolves.toBeUndefined();
    });
  });
});
