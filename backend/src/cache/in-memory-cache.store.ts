import { CacheStore } from './cache.models';

// Guards against unbounded growth from many distinct scoring configs.
const DEFAULT_MAX_ENTRIES = 500;

type Entry = { value: unknown; expiresAt: number };

// Process-local store. A Map keeps insertion order, so the first key is always
// the oldest write — evicted first once the soft cap is exceeded. Expired
// entries are evicted lazily when read.
export class InMemoryCacheStore implements CacheStore {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly maxEntries = DEFAULT_MAX_ENTRIES) {}

  get<T>(key: string): Promise<T | undefined> {
    const entry = this.entries.get(key);
    if (!entry) return Promise.resolve(undefined);
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return Promise.resolve(undefined);
    }
    return Promise.resolve(entry.value as T);
  }

  set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    // Re-inserting moves the key to the end, so a rewrite counts as newest.
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string;
      this.entries.delete(oldestKey);
    }
    return Promise.resolve();
  }

  deleteByPrefix(prefix: string): Promise<number> {
    let deleted = 0;
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
        deleted++;
      }
    }
    return Promise.resolve(deleted);
  }

  clear(): Promise<number> {
    const size = this.entries.size;
    this.entries.clear();
    return Promise.resolve(size);
  }
}
