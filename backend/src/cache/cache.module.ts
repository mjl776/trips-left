import { Global, Module } from '@nestjs/common';
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service';
import { CACHE_STORE } from './cache.models';
import { InMemoryCacheStore } from './in-memory-cache.store';

// Global so any feature module can inject CacheService without importing this
// module. Swap the CACHE_STORE provider to change the backing store.
@Global()
@Module({
  controllers: [CacheController],
  providers: [
    { provide: CACHE_STORE, useFactory: () => new InMemoryCacheStore() },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
