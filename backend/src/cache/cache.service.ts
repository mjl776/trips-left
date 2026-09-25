import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import {
  CACHE_STORE,
  CacheStats,
  CacheStore,
  FlushCacheResponse,
} from './cache.models';

const DEFAULT_STATS_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_FLUSH_PREFIX = 'stats:';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger('Cache');
  // Single-flight: concurrent misses for the same key share one loader call.
  private readonly inFlight = new Map<string, Promise<unknown>>();
  // Bumped on every flush so a load that started before the flush can't
  // write its (now stale) result back afterwards.
  private generation = 0;
  private hits = 0;
  private misses = 0;

  constructor(@Inject(CACHE_STORE) private readonly store: CacheStore) {}

  // Env is read per call (not at construction) so it can change in tests and
  // the kill switch takes effect without a code change.
  get enabled(): boolean {
    return process.env.STATS_CACHE_ENABLED !== 'false';
  }

  get statsTtlMs(): number {
    const parsed = Number(process.env.STATS_CACHE_TTL_MS);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_STATS_TTL_MS;
  }

  getStats(): CacheStats {
    return { hits: this.hits, misses: this.misses };
  }

  get<T>(key: string): Promise<T | undefined> {
    return this.store.get<T>(key);
  }

  set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    return this.store.set(key, value, ttlMs);
  }

  // Returns the cached value on a hit; on a miss runs `loader` once and caches
  // the result. Rejections are never cached — the error propagates to every
  // waiting caller and the next call retries.
  async wrap<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled) return loader();

    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) return pending;

    const cached = await this.store.get<T>(key);
    if (cached !== undefined) {
      this.hits++;
      this.logger.debug(`hit ${key}`);
      return cached;
    }

    // Another caller may have started the load while we awaited the store.
    const raced = this.inFlight.get(key) as Promise<T> | undefined;
    if (raced) return raced;

    this.misses++;
    this.logger.debug(`miss ${key}`);
    const load = this.loadAndStore(key, ttlMs, loader, this.generation);
    this.inFlight.set(key, load);
    // Registered before any caller awaits `load`, so the entry is gone by the
    // time they resume. A flush may have replaced it with a newer load; leave
    // that one. The catch only silences this side chain — callers still see
    // the rejection through `load`.
    load
      .finally(() => {
        if (this.inFlight.get(key) === load) this.inFlight.delete(key);
      })
      .catch(() => undefined);
    return load;
  }

  private async loadAndStore<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
    generation: number,
  ): Promise<T> {
    const value = await loader();
    if (generation === this.generation) {
      await this.store.set(key, value, ttlMs);
    }
    return value;
  }

  // POST /admin/cache/flush. Disabled (404) unless CACHE_FLUSH_TOKEN is set,
  // so it's safe by default; a wrong or missing token is a 401.
  async flush(
    token: string | undefined,
    prefix: unknown = DEFAULT_FLUSH_PREFIX,
  ): Promise<FlushCacheResponse> {
    const expectedToken = process.env.CACHE_FLUSH_TOKEN;
    if (!expectedToken) {
      throw new NotFoundException();
    }
    if (!token || !timingSafeEqual(digest(token), digest(expectedToken))) {
      throw new UnauthorizedException('Invalid admin token');
    }
    if (typeof prefix !== 'string') {
      throw new BadRequestException('prefix must be a string');
    }

    this.generation++;
    for (const key of [...this.inFlight.keys()]) {
      if (key.startsWith(prefix)) this.inFlight.delete(key);
    }
    const flushed = await this.store.deleteByPrefix(prefix);
    this.logger.log(`flushed ${flushed} entries with prefix "${prefix}"`);
    return { flushed };
  }
}
