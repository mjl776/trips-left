import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { PositionStatsModule } from '../stats/position-stats.module';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';

@Module({
  imports: [PrismaModule, PositionStatsModule],
  controllers: [PlayerController],
  providers: [PlayerService],
})
export class PlayerModule {}
