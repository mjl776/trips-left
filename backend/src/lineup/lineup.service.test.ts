import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LineupService } from './lineup.service';
import { PrismaService } from '../prisma.service';
import { createMockPrismaService, MockPrismaService } from '../test/prisma-mock';

describe('LineupService', () => {
  let service: LineupService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineupService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(LineupService);
  });

  describe('createLineup', () => {
    it('throws NotFoundException when the league does not exist', async () => {
      prisma.league.findUnique.mockResolvedValue(null);

      await expect(
        service.createLineup({ leagueId: 'l1', name: 'Team', assignments: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when a player is assigned to multiple slots', async () => {
      prisma.league.findUnique.mockResolvedValue({ rosterPositions: ['QB', 'RB'] });

      await expect(
        service.createLineup({
          leagueId: 'l1',
          name: 'Team',
          assignments: [
            { playerId: 'p1', slot: 'QB' },
            { playerId: 'p1', slot: 'RB' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the slot is not available in the league', async () => {
      prisma.league.findUnique.mockResolvedValue({ rosterPositions: ['QB'] });

      await expect(
        service.createLineup({
          leagueId: 'l1',
          name: 'Team',
          assignments: [{ playerId: 'p1', slot: 'RB' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the player does not exist', async () => {
      prisma.league.findUnique.mockResolvedValue({ rosterPositions: ['QB'] });
      prisma.player.findMany.mockResolvedValue([]);

      await expect(
        service.createLineup({
          leagueId: 'l1',
          name: 'Team',
          assignments: [{ playerId: 'p1', slot: 'QB' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the player is ineligible for the slot', async () => {
      prisma.league.findUnique.mockResolvedValue({ rosterPositions: ['QB'] });
      prisma.player.findMany.mockResolvedValue([{ playerId: 'p1', position: 'RB' }]);

      await expect(
        service.createLineup({
          leagueId: 'l1',
          name: 'Team',
          assignments: [{ playerId: 'p1', slot: 'QB' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the roster on success', async () => {
      prisma.league.findUnique.mockResolvedValue({ rosterPositions: ['QB', 'BN'] });
      prisma.player.findMany.mockResolvedValue([{ playerId: 'p1', position: 'QB' }]);
      const created = { rosterId: 'r1', leagueId: 'l1', name: 'Team', rosterPlayers: [] };
      prisma.roster.create.mockResolvedValue(created);

      const result = await service.createLineup({
        leagueId: 'l1',
        name: 'Team',
        assignments: [{ playerId: 'p1', slot: 'QB' }],
      });

      expect(prisma.roster.create).toHaveBeenCalledWith({
        data: {
          rosterId: expect.any(String),
          leagueId: 'l1',
          name: 'Team',
          rosterPlayers: { create: [{ playerId: 'p1', slot: 'QB' }] },
        },
        include: { rosterPlayers: true },
      });
      expect(result).toBe(created);
    });
  });

  describe('addPlayer', () => {
    it('throws NotFoundException when the roster does not exist', async () => {
      prisma.roster.findUnique.mockResolvedValue(null);

      await expect(
        service.addPlayer({ rosterId: 'r1', leagueId: 'l1', playerId: 'p1', slot: 'QB' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the player is already rostered', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [{ playerId: 'p1', slot: 'QB' }],
        league: { rosterPositions: ['QB'] },
      });

      await expect(
        service.addPlayer({ rosterId: 'r1', leagueId: 'l1', playerId: 'p1', slot: 'QB' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the slot has no capacity', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [{ playerId: 'existing', slot: 'QB' }],
        league: { rosterPositions: ['QB'] },
      });

      await expect(
        service.addPlayer({ rosterId: 'r1', leagueId: 'l1', playerId: 'p2', slot: 'QB' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the player does not exist', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [],
        league: { rosterPositions: ['QB'] },
      });
      prisma.player.findUnique.mockResolvedValue(null);

      await expect(
        service.addPlayer({ rosterId: 'r1', leagueId: 'l1', playerId: 'p2', slot: 'QB' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the player is ineligible for the slot', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [],
        league: { rosterPositions: ['QB'] },
      });
      prisma.player.findUnique.mockResolvedValue({ playerId: 'p2', position: 'RB' });

      await expect(
        service.addPlayer({ rosterId: 'r1', leagueId: 'l1', playerId: 'p2', slot: 'QB' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the roster player on success', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [],
        league: { rosterPositions: ['QB'] },
      });
      prisma.player.findUnique.mockResolvedValue({ playerId: 'p2', position: 'QB' });
      const created = { rosterId: 'r1', leagueId: 'l1', playerId: 'p2', slot: 'QB' };
      prisma.rosterPlayer.create.mockResolvedValue(created);

      const result = await service.addPlayer({
        rosterId: 'r1',
        leagueId: 'l1',
        playerId: 'p2',
        slot: 'QB',
      });

      expect(prisma.rosterPlayer.create).toHaveBeenCalledWith({
        data: { rosterId: 'r1', leagueId: 'l1', playerId: 'p2', slot: 'QB' },
      });
      expect(result).toBe(created);
    });
  });

  describe('deletePlayer', () => {
    it('throws NotFoundException when the roster does not exist', async () => {
      prisma.roster.findUnique.mockResolvedValue(null);

      await expect(
        service.deletePlayer({ rosterId: 'r1', leagueId: 'l1', playerId: 'p1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the player is not rostered', async () => {
      prisma.roster.findUnique.mockResolvedValue({ rosterPlayers: [], league: {} });

      await expect(
        service.deletePlayer({ rosterId: 'r1', leagueId: 'l1', playerId: 'p1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deletes the roster player on success', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [{ playerId: 'p1', slot: 'QB' }],
        league: {},
      });
      const deleted = { rosterId: 'r1', leagueId: 'l1', playerId: 'p1' };
      prisma.rosterPlayer.delete.mockResolvedValue(deleted);

      const result = await service.deletePlayer({
        rosterId: 'r1',
        leagueId: 'l1',
        playerId: 'p1',
      });

      expect(prisma.rosterPlayer.delete).toHaveBeenCalledWith({
        where: {
          rosterId_leagueId_playerId: { playerId: 'p1', leagueId: 'l1', rosterId: 'r1' },
        },
      });
      expect(result).toBe(deleted);
    });
  });

  describe('addDropPlayer', () => {
    it('throws BadRequestException when the add player is already rostered', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [{ playerId: 'addId', slot: 'QB' }],
        league: { rosterPositions: ['QB'] },
      });

      await expect(
        service.addDropPlayer({
          rosterId: 'r1',
          leagueId: 'l1',
          slot: 'QB',
          addPlayerId: 'addId',
          dropPlayerId: 'dropId',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the drop player is not rostered', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [],
        league: { rosterPositions: ['QB'] },
      });

      await expect(
        service.addDropPlayer({
          rosterId: 'r1',
          leagueId: 'l1',
          slot: 'QB',
          addPlayerId: 'addId',
          dropPlayerId: 'dropId',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the slot has no room once the drop player is excluded', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [
          { playerId: 'dropId', slot: 'QB' },
          { playerId: 'other', slot: 'QB' },
        ],
        league: { rosterPositions: ['QB'] },
      });

      await expect(
        service.addDropPlayer({
          rosterId: 'r1',
          leagueId: 'l1',
          slot: 'QB',
          addPlayerId: 'addId',
          dropPlayerId: 'dropId',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('swaps the players inside a transaction on success', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [{ playerId: 'dropId', slot: 'QB' }],
        league: { rosterPositions: ['QB', 'QB'] },
      });
      prisma.player.findUnique.mockResolvedValue({ playerId: 'addId', position: 'QB' });
      prisma.rosterPlayer.delete.mockResolvedValue({ playerId: 'dropId' });
      const created = { playerId: 'addId', slot: 'QB' };
      prisma.rosterPlayer.create.mockResolvedValue(created);

      const result = await service.addDropPlayer({
        rosterId: 'r1',
        leagueId: 'l1',
        slot: 'QB',
        addPlayerId: 'addId',
        dropPlayerId: 'dropId',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.rosterPlayer.delete).toHaveBeenCalledWith({
        where: {
          rosterId_leagueId_playerId: { playerId: 'dropId', leagueId: 'l1', rosterId: 'r1' },
        },
      });
      expect(prisma.rosterPlayer.create).toHaveBeenCalledWith({
        data: { rosterId: 'r1', leagueId: 'l1', playerId: 'addId', slot: 'QB' },
      });
      expect(result).toBe(created);
    });
  });

  describe('swapSlots', () => {
    it('throws NotFoundException when the roster does not exist', async () => {
      prisma.roster.findUnique.mockResolvedValue(null);

      await expect(
        service.swapSlots({ rosterId: 'r1', leagueId: 'l1', playerAId: 'a', playerBId: 'b' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when either player is not rostered', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [{ playerId: 'a', slot: 'QB' }],
      });

      await expect(
        service.swapSlots({ rosterId: 'r1', leagueId: 'l1', playerAId: 'a', playerBId: 'b' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('swaps the two players slots on success', async () => {
      prisma.roster.findUnique.mockResolvedValue({
        rosterPlayers: [
          { playerId: 'a', slot: 'QB' },
          { playerId: 'b', slot: 'RB' },
        ],
      });
      prisma.rosterPlayer.update
        .mockResolvedValueOnce({ playerId: 'a', slot: 'RB' })
        .mockResolvedValueOnce({ playerId: 'b', slot: 'QB' });

      const result = await service.swapSlots({
        rosterId: 'r1',
        leagueId: 'l1',
        playerAId: 'a',
        playerBId: 'b',
      });

      expect(prisma.rosterPlayer.update).toHaveBeenNthCalledWith(1, {
        where: { rosterId_leagueId_playerId: { rosterId: 'r1', leagueId: 'l1', playerId: 'a' } },
        data: { slot: 'RB' },
      });
      expect(prisma.rosterPlayer.update).toHaveBeenNthCalledWith(2, {
        where: { rosterId_leagueId_playerId: { rosterId: 'r1', leagueId: 'l1', playerId: 'b' } },
        data: { slot: 'QB' },
      });
      expect(result).toEqual([
        { playerId: 'a', slot: 'RB' },
        { playerId: 'b', slot: 'QB' },
      ]);
    });
  });

  describe('viewLineup', () => {
    it('throws NotFoundException when the roster does not exist', async () => {
      prisma.roster.findUnique.mockResolvedValue(null);

      await expect(
        service.viewLineup({ rosterId: 'r1', leagueId: 'l1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the roster on success', async () => {
      const roster = { rosterId: 'r1', leagueId: 'l1', rosterPlayers: [] };
      prisma.roster.findUnique.mockResolvedValue(roster);

      const result = await service.viewLineup({ rosterId: 'r1', leagueId: 'l1' });

      expect(result).toBe(roster);
    });
  });

  describe('deleteRoster', () => {
    it('throws NotFoundException when the roster does not exist', async () => {
      prisma.roster.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteRoster({ rosterId: 'r1', leagueId: 'l1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes the roster on success', async () => {
      prisma.roster.findUnique.mockResolvedValue({ rosterId: 'r1', rosterPlayers: [], league: {} });
      const deleted = { rosterId: 'r1', leagueId: 'l1' };
      prisma.roster.delete.mockResolvedValue(deleted);

      const result = await service.deleteRoster({ rosterId: 'r1', leagueId: 'l1' });

      expect(prisma.roster.delete).toHaveBeenCalledWith({
        where: { rosterId_leagueId: { rosterId: 'r1', leagueId: 'l1' } },
      });
      expect(result).toBe(deleted);
    });
  });
});
