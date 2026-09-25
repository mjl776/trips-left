import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { CACHE_STORE } from './cache.models';
import { InMemoryCacheStore } from './in-memory-cache.store';

describe('CacheService', () => {
  let service: CacheService;
  let store: InMemoryCacheStore;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    delete process.env.STATS_CACHE_ENABLED;
    delete process.env.STATS_CACHE_TTL_MS;
    delete process.env.CACHE_FLUSH_TOKEN;
    store = new InMemoryCacheStore();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService, { provide: CACHE_STORE, useValue: store }],
    }).compile();

    service = module.get(CacheService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.useRealTimers();
  });

  describe('wrap', () => {
    it('runs the loader on a miss and returns the cached value on a hit', async () => {
      const loader = jest.fn().mockResolvedValue([1, 2, 3]);

      await expect(service.wrap('k', 1000, loader)).resolves.toEqual([1, 2, 3]);
      await expect(service.wrap('k', 1000, loader)).resolves.toEqual([1, 2, 3]);

      expect(loader).toHaveBeenCalledTimes(1);
      expect(service.getStats()).toEqual({ hits: 1, misses: 1 });
    });

    it('reloads after the TTL expires', async () => {
      jest.useFakeTimers();
      const loader = jest
        .fn()
        .mockResolvedValueOnce('first')
        .mockResolvedValueOnce('second');

      await expect(service.wrap('k', 1000, loader)).resolves.toBe('first');
      jest.advanceTimersByTime(999);
      await expect(service.wrap('k', 1000, loader)).resolves.toBe('first');
      jest.advanceTimersByTime(1);
      await expect(service.wrap('k', 1000, loader)).resolves.toBe('second');

      expect(loader).toHaveBeenCalledTimes(2);
    });

    it('shares one in-flight load between concurrent callers (single-flight)', async () => {
      let resolveLoad!: (value: string) => void;
      const loader = jest.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveLoad = resolve;
          }),
      );

      const first = service.wrap('k', 1000, loader);
      const second = service.wrap('k', 1000, loader);
      // Let both callers get past their async store lookup.
      await new Promise((resolve) => setImmediate(resolve));
      resolveLoad('value');

      await expect(Promise.all([first, second])).resolves.toEqual([
        'value',
        'value',
      ]);
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('does not cache a rejected load, and the next call retries', async () => {
      const loader = jest
        .fn()
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce('recovered');

      await expect(service.wrap('k', 1000, loader)).rejects.toThrow('db down');
      await expect(service.wrap('k', 1000, loader)).resolves.toBe('recovered');
      expect(loader).toHaveBeenCalledTimes(2);
    });

    it('bypasses the cache entirely when STATS_CACHE_ENABLED=false', async () => {
      process.env.STATS_CACHE_ENABLED = 'false';
      const loader = jest.fn().mockResolvedValue('v');

      await service.wrap('k', 1000, loader);
      await service.wrap('k', 1000, loader);

      expect(loader).toHaveBeenCalledTimes(2);
      await expect(store.get('k')).resolves.toBeUndefined();
    });

    it("doesn't store a load that was in flight when the cache was flushed", async () => {
      process.env.CACHE_FLUSH_TOKEN = 'secret';
      let resolveLoad!: (value: string) => void;
      const slowLoader = () =>
        new Promise<string>((resolve) => {
          resolveLoad = resolve;
        });

      const stale = service.wrap('stats:k', 1000, slowLoader);
      await new Promise((resolve) => setImmediate(resolve));
      await service.flush('secret');
      resolveLoad('stale');

      await expect(stale).resolves.toBe('stale');
      await expect(store.get('stats:k')).resolves.toBeUndefined();
    });
  });

  describe('statsTtlMs', () => {
    it('defaults to 12h and honors STATS_CACHE_TTL_MS', () => {
      expect(service.statsTtlMs).toBe(12 * 60 * 60 * 1000);
      process.env.STATS_CACHE_TTL_MS = '5000';
      expect(service.statsTtlMs).toBe(5000);
      process.env.STATS_CACHE_TTL_MS = 'not-a-number';
      expect(service.statsTtlMs).toBe(12 * 60 * 60 * 1000);
    });
  });

  describe('flush', () => {
    beforeEach(async () => {
      await store.set('stats:pts:QB', [1], 1000);
      await store.set('stats:col:WR', [2], 1000);
      await store.set('other:x', [3], 1000);
    });

    it('is disabled (404) when CACHE_FLUSH_TOKEN is unset', async () => {
      await expect(service.flush('anything')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(store.get('stats:pts:QB')).resolves.toEqual([1]);
    });

    it('rejects a missing or wrong token with 401', async () => {
      process.env.CACHE_FLUSH_TOKEN = 'secret';

      await expect(service.flush(undefined)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(service.flush('wrong')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(store.get('stats:pts:QB')).resolves.toEqual([1]);
    });

    it('rejects a non-string prefix with 400', async () => {
      process.env.CACHE_FLUSH_TOKEN = 'secret';
      await expect(service.flush('secret', 42)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('flushes the stats: prefix by default and returns the count', async () => {
      process.env.CACHE_FLUSH_TOKEN = 'secret';

      await expect(service.flush('secret')).resolves.toEqual({ flushed: 2 });
      await expect(store.get('stats:pts:QB')).resolves.toBeUndefined();
      await expect(store.get('other:x')).resolves.toEqual([3]);
    });

    it('flushes only the given prefix', async () => {
      process.env.CACHE_FLUSH_TOKEN = 'secret';

      await expect(service.flush('secret', 'stats:col:')).resolves.toEqual({
        flushed: 1,
      });
      await expect(store.get('stats:pts:QB')).resolves.toEqual([1]);
    });
  });
});
