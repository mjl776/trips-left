import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { CacheService } from './cache.service';
import { FlushCacheInput, FlushCacheResponse } from './cache.models';

@Controller('admin/cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Post('flush')
  @HttpCode(200)
  flush(
    @Headers('x-admin-token') token: string | undefined,
    @Body() body: FlushCacheInput | undefined,
  ): Promise<FlushCacheResponse> {
    return this.cacheService.flush(token, body?.prefix);
  }
}
