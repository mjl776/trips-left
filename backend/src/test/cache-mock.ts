import { CacheService } from '../cache/cache.service';

// CacheService test double that never caches: `wrap` just runs the loader.
// Keeps service tests that build the real PositionStatsService behaving as if
// there were no cache (each call hits the Prisma mock).
export function createPassThroughCacheProvider() {
  return {
    provide: CacheService,
    useValue: {
      statsTtlMs: 0,
      wrap: jest.fn(
        (_key: string, _ttlMs: number, loader: () => Promise<unknown>) =>
          loader(),
      ),
    },
  };
}
