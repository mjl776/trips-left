import { Test, TestingModule } from '@nestjs/testing';
import { LineupController } from './lineup.controller';
import { LineupService } from './lineup.service';

describe('LineupController', () => {
  let controller: LineupController;
  let service: {
    createLineup: jest.Mock;
    addPlayer: jest.Mock;
    addDropPlayer: jest.Mock;
    deletePlayer: jest.Mock;
    swapSlots: jest.Mock;
    viewLineup: jest.Mock;
    deleteRoster: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createLineup: jest.fn(),
      addPlayer: jest.fn(),
      addDropPlayer: jest.fn(),
      deletePlayer: jest.fn(),
      swapSlots: jest.fn(),
      viewLineup: jest.fn(),
      deleteRoster: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LineupController],
      providers: [{ provide: LineupService, useValue: service }],
    }).compile();

    controller = module.get(LineupController);
  });

  it('postLineup delegates to createLineup', async () => {
    const input = { leagueId: 'l1', name: 'Team', assignments: [] };
    const created = { rosterId: 'r1' };
    service.createLineup.mockResolvedValue(created);

    await expect(controller.postLineup(input)).resolves.toBe(created);
    expect(service.createLineup).toHaveBeenCalledWith(input);
  });

  it('addPlayer delegates to the service', async () => {
    const input = { rosterId: 'r1', leagueId: 'l1', playerId: 'p1', slot: 'QB' };
    const added = { playerId: 'p1' };
    service.addPlayer.mockResolvedValue(added);

    await expect(controller.addPlayer(input)).resolves.toBe(added);
    expect(service.addPlayer).toHaveBeenCalledWith(input);
  });

  it('addDropPlayer delegates to the service', async () => {
    const input = {
      rosterId: 'r1',
      leagueId: 'l1',
      slot: 'QB',
      addPlayerId: 'p1',
      dropPlayerId: 'p2',
    };
    const swapped = { playerId: 'p1' };
    service.addDropPlayer.mockResolvedValue(swapped);

    await expect(controller.addDropPlayer(input)).resolves.toBe(swapped);
    expect(service.addDropPlayer).toHaveBeenCalledWith(input);
  });

  it('deleteLineup delegates to deletePlayer', async () => {
    const input = { rosterId: 'r1', leagueId: 'l1', playerId: 'p1' };
    const deleted = { playerId: 'p1' };
    service.deletePlayer.mockResolvedValue(deleted);

    await expect(controller.deleteLineup(input)).resolves.toBe(deleted);
    expect(service.deletePlayer).toHaveBeenCalledWith(input);
  });

  it('swapPlayers delegates to swapSlots', async () => {
    const input = { rosterId: 'r1', leagueId: 'l1', playerAId: 'a', playerBId: 'b' };
    const swapped = [{}, {}];
    service.swapSlots.mockResolvedValue(swapped);

    await expect(controller.swapPlayers(input)).resolves.toBe(swapped);
    expect(service.swapSlots).toHaveBeenCalledWith(input);
  });

  it('viewLineup delegates to the service', async () => {
    const input = { rosterId: 'r1', leagueId: 'l1' };
    const lineup = { rosterId: 'r1' };
    service.viewLineup.mockResolvedValue(lineup);

    await expect(controller.viewLineup(input)).resolves.toBe(lineup);
    expect(service.viewLineup).toHaveBeenCalledWith(input);
  });

  it('deleteRoster delegates to the service', async () => {
    const input = { rosterId: 'r1', leagueId: 'l1' };
    const deleted = { rosterId: 'r1' };
    service.deleteRoster.mockResolvedValue(deleted);

    await expect(controller.deleteRoster(input)).resolves.toBe(deleted);
    expect(service.deleteRoster).toHaveBeenCalledWith(input);
  });
});
