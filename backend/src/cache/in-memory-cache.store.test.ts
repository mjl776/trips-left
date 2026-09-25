import { InMemoryCacheStore } from './in-memory-cache.store';

describe('InMemoryCacheStore', () => {
  afterEach(() => jest.useRealTimers());

  it('returns stored values until they expire, then evicts them lazily', async () => {
    jest.useFakeTimers();
    const store = new InMemoryCacheStore();
    await store.set('k', 'v', 100);

    await expect(store.get('k')).resolves.toBe('v');
    jest.advanceTimersByTime(100);
    await expect(store.get('k')).resolves.toBeUndefined();
    await expect(store.clear()).resolves.toBe(0);
  });

  it('evicts the oldest entry once the soft cap is exceeded', async () => {
    const store = new InMemoryCacheStore(2);
    await store.set('a', 1, 1000);
    await store.set('b', 2, 1000);
    // Rewriting `a` makes it the newest, so `b` is now the oldest.
    await store.set('a', 1, 1000);
    await store.set('c', 3, 1000);

    await expect(store.get('b')).resolves.toBeUndefined();
    await expect(store.get('a')).resolves.toBe(1);
    await expect(store.get('c')).resolves.toBe(3);
  });

  it('deletes by prefix and clears everything', async () => {
    const store = new InMemoryCacheStore();
    await store.set('stats:a', 1, 1000);
    await store.set('stats:b', 2, 1000);
    await store.set('other', 3, 1000);

    await expect(store.deleteByPrefix('stats:')).resolves.toBe(2);
    await expect(store.get('other')).resolves.toBe(3);
    await expect(store.clear()).resolves.toBe(1);
  });
});
