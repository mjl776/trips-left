import { Test, TestingModule } from '@nestjs/testing';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';

describe('PlayerController', () => {
  let controller: PlayerController;
  let service: {
    getPlayers: jest.Mock;
    viewPlayer: jest.Mock;
    getPlayerStatRank: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getPlayers: jest.fn(),
      viewPlayer: jest.fn(),
      getPlayerStatRank: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerController],
      providers: [{ provide: PlayerService, useValue: service }],
    }).compile();

    controller = module.get(PlayerController);
  });

  it('getPlayers delegates to the service', async () => {
    const players = [{ playerId: 'p1' }];
    service.getPlayers.mockResolvedValue(players);

    await expect(controller.getPlayers()).resolves.toBe(players);
    expect(service.getPlayers).toHaveBeenCalledWith();
  });

  it('viewPlayer delegates with the query', async () => {
    const query = { playerId: 'p1', season: '2025' };
    const overview = { playerId: 'p1' };
    service.viewPlayer.mockResolvedValue(overview);

    await expect(controller.viewPlayer(query)).resolves.toBe(overview);
    expect(service.viewPlayer).toHaveBeenCalledWith(query);
  });

  it('getPlayerStatRank delegates with the query', async () => {
    const query = { playerId: 'p1', season: '2025', stat: 'wopr' };
    const rank = { playerId: 'p1', stat: 'wopr' };
    service.getPlayerStatRank.mockResolvedValue(rank);

    await expect(controller.getPlayerStatRank(query)).resolves.toBe(rank);
    expect(service.getPlayerStatRank).toHaveBeenCalledWith(query);
  });
});
