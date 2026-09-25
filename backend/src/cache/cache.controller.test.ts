import { Test, TestingModule } from '@nestjs/testing';
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service';

describe('CacheController', () => {
  let controller: CacheController;
  let service: { flush: jest.Mock };

  beforeEach(async () => {
    service = { flush: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
      providers: [{ provide: CacheService, useValue: service }],
    }).compile();

    controller = module.get(CacheController);
  });

  it('flush delegates the admin token and prefix', async () => {
    service.flush.mockResolvedValue({ flushed: 3 });

    await expect(
      controller.flush('token', { prefix: 'stats:pts:' }),
    ).resolves.toEqual({ flushed: 3 });
    expect(service.flush).toHaveBeenCalledWith('token', 'stats:pts:');
  });

  it('flush passes an undefined prefix when there is no body', async () => {
    service.flush.mockResolvedValue({ flushed: 0 });

    await controller.flush(undefined, undefined);
    expect(service.flush).toHaveBeenCalledWith(undefined, undefined);
  });
});
