import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { PositionStatsModule } from '../stats/position-stats.module';
import { ProjectionsController } from './projections.controller';
import { ProjectionsService } from './projections.service';

@Module({
  imports: [PrismaModule, PositionStatsModule],
  controllers: [ProjectionsController],
  providers: [ProjectionsService],
})
export class ProjectionsModule {}
