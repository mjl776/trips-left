import { Test, TestingModule } from '@nestjs/testing';
import { TradeController } from './trade.controller';
import { TradeService } from './trade.service';

describe('TradeController', () => {
  let controller: TradeController;
  let service: { simulateTrade: jest.Mock };

  beforeEach(async () => {
    service = { simulateTrade: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradeController],
      providers: [{ provide: TradeService, useValue: service }],
    }).compile();

    controller = module.get(TradeController);
  });

  it('simulateTrade delegates with the request body', async () => {
    const input = {
      leagueId: 'l1',
      season: 2025,
      playerOutId: 'out',
      playerInId: 'in',
    };
    const response = { playerOut: {}, playerIn: {}, roi: 0, simulation: null };
    service.simulateTrade.mockResolvedValue(response);

    await expect(controller.simulateTrade(input)).resolves.toBe(response);
    expect(service.simulateTrade).toHaveBeenCalledWith(input);
  });
});
