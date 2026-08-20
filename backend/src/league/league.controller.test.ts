import { Test, TestingModule } from '@nestjs/testing';
import { LeagueController } from './league.controller';
import { LeagueService } from './league.service';

describe('LeagueController', () => {
  let controller: LeagueController;
  let service: {
    postMockLeague: jest.Mock;
    importSleeperLeague: jest.Mock;
    getLeagueSettings: jest.Mock;
    modifyMockLeagueSettings: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      postMockLeague: jest.fn(),
      importSleeperLeague: jest.fn(),
      getLeagueSettings: jest.fn(),
      modifyMockLeagueSettings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeagueController],
      providers: [{ provide: LeagueService, useValue: service }],
    }).compile();

    controller = module.get(LeagueController);
  });

  it('postMockLeague delegates to the service', async () => {
    const league = { leagueId: 'l1' };
    service.postMockLeague.mockResolvedValue(league);

    await expect(controller.postMockLeague()).resolves.toBe(league);
    expect(service.postMockLeague).toHaveBeenCalledWith();
  });

  it('postImportSleeperLeague delegates with the leagueId param', async () => {
    const league = { leagueId: 'l1' };
    service.importSleeperLeague.mockResolvedValue(league);

    await expect(controller.postImportSleeperLeague('l1')).resolves.toBe(
      league,
    );
    expect(service.importSleeperLeague).toHaveBeenCalledWith('l1');
  });

  it('getSleeperLeague delegates with the leagueId param', async () => {
    const settings = { rosterPositions: [], scoringSettings: {} };
    service.getLeagueSettings.mockResolvedValue(settings);

    await expect(controller.getSleeperLeague('l1')).resolves.toBe(settings);
    expect(service.getLeagueSettings).toHaveBeenCalledWith('l1');
  });

  it('updateSleeperMockLeagueSettings delegates with the leagueId param', async () => {
    service.modifyMockLeagueSettings.mockResolvedValue(undefined);

    await expect(
      controller.updateSleeperMockLeagueSettings('l1'),
    ).resolves.toBeUndefined();
    expect(service.modifyMockLeagueSettings).toHaveBeenCalledWith('l1');
  });
});
