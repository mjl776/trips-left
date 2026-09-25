// Storage seam for CacheService. InMemoryCacheStore is the only implementation
// today; a RedisCacheStore can be swapped in behind CACHE_STORE without
// touching any caller.
export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  deleteByPrefix(prefix: string): Promise<number>;
  clear(): Promise<number>;
}

export const CACHE_STORE = Symbol('CACHE_STORE');

export type FlushCacheInput = {
  prefix?: string;
};

export type FlushCacheResponse = {
  flushed: number;
};

export type CacheStats = {
  hits: number;
  misses: number;
};
