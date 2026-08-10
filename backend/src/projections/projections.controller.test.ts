import { Test, TestingModule } from '@nestjs/testing';
import { ProjectionsController } from './projections.controller';
import { ProjectionsService } from './projections.service';

describe('ProjectionsController', () => {
  let controller: ProjectionsController;
  let service: {
    getProjections: jest.Mock;
    getLineupInsights: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getProjections: jest.fn(),
      getLineupInsights: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectionsController],
      providers: [{ provide: ProjectionsService, useValue: service }],
    }).compile();

    controller = module.get(ProjectionsController);
  });

  it('getProjections delegates with the query', async () => {
    const query = { leagueId: 'l1', season: '2025', week: '1' };
    const projections = [{ playerId: 'p1' }];
    service.getProjections.mockResolvedValue(projections);

    await expect(controller.getProjections(query)).resolves.toBe(projections);
    expect(service.getProjections).toHaveBeenCalledWith(query);
  });

  it('getLineupInsights delegates with the query', async () => {
    const query = { rosterId: 'r1', leagueId: 'l1', season: '2025' };
    const insights = { rosterId: 'r1' };
    service.getLineupInsights.mockResolvedValue(insights);

    await expect(controller.getLineupInsights(query)).resolves.toBe(insights);
    expect(service.getLineupInsights).toHaveBeenCalledWith(query);
  });
});
