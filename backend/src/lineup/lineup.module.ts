import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { PositionStatsModule } from '../stats/position-stats.module';
import { LineupService } from './lineup.service';
import { LineupController } from './lineup.controller';

@Module({
  imports: [PrismaModule, PositionStatsModule],
  controllers: [LineupController],
  providers: [LineupService],
})
export class LineupModule {}
