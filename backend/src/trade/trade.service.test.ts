import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TradeService } from './trade.service';
import { PrismaService } from '../prisma.service';
import {
  createMockPrismaService,
  dec,
  MockPrismaService,
} from '../test/prisma-mock';
import { DEFAULT_SCORING_SETTINGS } from '../league/league.models';

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
    targets: null,
    carries: null,
    attempts: null,
    ...overrides,
  };
}

describe('TradeService', () => {
  let service: TradeService;
  let prisma: MockPrismaService;
  const originalEnv = process.env.SIMULATION_SERVICE_URL;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TradeService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TradeService);
    prisma.league.findUnique.mockResolvedValue({
      scoringSettings: DEFAULT_SCORING_SETTINGS,
    });
    process.env.SIMULATION_SERVICE_URL = undefined;
  });

  afterEach(() => {
    process.env.SIMULATION_SERVICE_URL = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws NotFoundException when the league does not exist', async () => {
    prisma.league.findUnique.mockResolvedValue(null);

    await expect(
      service.simulateTrade({
        leagueId: 'l1',
        season: 2025,
        playerOutId: 'out',
        playerInId: 'in',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when playerOut does not exist', async () => {
    prisma.player.findUnique.mockImplementation(
      ({ where }: { where: { playerId: string } }) =>
        Promise.resolve(
          where.playerId === 'in'
            ? { playerId: 'in', fullName: 'In', position: 'RB', team: 'X' }
            : null,
        ),
    );
    prisma.playerStats.findMany.mockResolvedValue([]);

    await expect(
      service.simulateTrade({
        leagueId: 'l1',
        season: 2025,
        playerOutId: 'out',
        playerInId: 'in',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('computes value/efficiency/roi from realized stats and returns simulation:null with no SIMULATION_SERVICE_URL set', async () => {
    prisma.player.findUnique.mockImplementation(
      ({ where }: { where: { playerId: string } }) =>
        Promise.resolve({
          playerId: where.playerId,
          fullName: where.playerId === 'out' ? 'Player Out' : 'Player In',
          position: 'RB',
          team: 'X',
        }),
    );
    prisma.playerStats.findMany.mockImplementation(
      ({ where }: { where: { playerId: string } }) => {
        if (where.playerId === 'out') {
          return Promise.resolve([
            statsRow({ rushYd: dec(100), rushTd: dec(1), carries: dec(20) }),
          ]); // 16 pts
        }
        return Promise.resolve([
          statsRow({ rushYd: dec(200), rushTd: dec(2), carries: dec(25) }),
        ]); // 32 pts
      },
    );

    const result = await service.simulateTrade({
      leagueId: 'l1',
      season: 2025,
      playerOutId: 'out',
      playerInId: 'in',
    });

    expect(result.playerOut).toEqual({
      playerId: 'out',
      fullName: 'Player Out',
      position: 'RB',
      team: 'X',
      value: 16,
      efficiency: 16 / 20,
      weeksPlayed: 1,
    });
    expect(result.playerIn.value).toBe(32);
    expect(result.roi).toBeCloseTo(((32 - 16) / 16) * 100);
    expect(result.simulation).toBeNull();
    expect(result.error).toBe('simulation_unavailable');
  });

  it('returns efficiency:null when there are zero opportunities', async () => {
    prisma.player.findUnique.mockResolvedValue({
      playerId: 'p',
      fullName: 'P',
      position: 'K',
      team: 'X',
    });
    prisma.playerStats.findMany.mockResolvedValue([
      statsRow({ fgMade0_19: dec(2) }),
    ]);

    const result = await service.simulateTrade({
      leagueId: 'l1',
      season: 2025,
      playerOutId: 'p',
      playerInId: 'p',
    });

    expect(result.playerOut.efficiency).toBeNull();
  });

  it('uses DEFAULT_SCORING_SETTINGS and skips the league lookup when leagueId is omitted', async () => {
    prisma.player.findUnique.mockResolvedValue({
      playerId: 'p',
      fullName: 'P',
      position: 'RB',
      team: 'X',
    });
    prisma.playerStats.findMany.mockResolvedValue([
      statsRow({ rushYd: dec(100), rushTd: dec(1), carries: dec(20) }),
    ]);

    const result = await service.simulateTrade({
      season: 2025,
      playerOutId: 'p',
      playerInId: 'p',
    });

    expect(prisma.league.findUnique).not.toHaveBeenCalled();
    expect(result.playerOut.value).toBe(16);
  });

  it('returns roi:null when playerOut has zero value', async () => {
    prisma.player.findUnique.mockResolvedValue({
      playerId: 'p',
      fullName: 'P',
      position: 'RB',
      team: 'X',
    });
    prisma.playerStats.findMany.mockResolvedValue([]);

    const result = await service.simulateTrade({
      leagueId: 'l1',
      season: 2025,
      playerOutId: 'p',
      playerInId: 'p',
    });

    expect(result.roi).toBeNull();
    expect(result.playerOut.weeksPlayed).toBe(0);
  });

  it('calls the simulation service with raw weekly points and maps the snake_case response', async () => {
    process.env.SIMULATION_SERVICE_URL = 'http://localhost:8001/';
    prisma.player.findUnique.mockImplementation(
      ({ where }: { where: { playerId: string } }) =>
        Promise.resolve({
          playerId: where.playerId,
          fullName: where.playerId,
          position: 'RB',
          team: 'X',
        }),
    );
    prisma.playerStats.findMany.mockImplementation(
      ({ where }: { where: { playerId: string } }) => {
        if (where.playerId === 'out')
          return Promise.resolve([statsRow({ rushYd: dec(50) })]);
        return Promise.resolve([statsRow({ rushYd: dec(80) })]);
      },
    );

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          expected_delta: 3,
          win_probability: 62.5,
          percentiles: { p10: -1, p50: 3, p90: 7 },
        }),
    });
    global.fetch = fetchMock;

    const result = await service.simulateTrade({
      leagueId: 'l1',
      season: 2025,
      playerOutId: 'out',
      playerInId: 'in',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/simulate-trade',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          player_out: { player_id: 'out', weekly_points: [5] },
          player_in: { player_id: 'in', weekly_points: [8] },
        }),
      }),
    );
    expect(result.simulation).toEqual({
      expectedDelta: 3,
      winProbability: 62.5,
      percentiles: { p10: -1, p50: 3, p90: 7 },
    });
    expect(result.error).toBeUndefined();
  });

  it('degrades to simulation:null when the simulation service call fails', async () => {
    process.env.SIMULATION_SERVICE_URL = 'http://localhost:8001';
    prisma.player.findUnique.mockResolvedValue({
      playerId: 'p',
      fullName: 'P',
      position: 'RB',
      team: 'X',
    });
    prisma.playerStats.findMany.mockResolvedValue([]);
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

    const result = await service.simulateTrade({
      leagueId: 'l1',
      season: 2025,
      playerOutId: 'p',
      playerInId: 'p',
    });

    expect(result.simulation).toBeNull();
    expect(result.error).toBe('simulation_unavailable');
  });
});
