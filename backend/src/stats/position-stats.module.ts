import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { PositionStatsService } from './position-stats.service';

@Module({
  imports: [PrismaModule],
  providers: [PositionStatsService],
  exports: [PositionStatsService],
})
export class PositionStatsModule {}
