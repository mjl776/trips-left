import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { CacheModule } from './cache/cache.module';
import { LeagueModule } from './league/league.module';
import { LineupModule } from './lineup/lineup.module';
import { PlayerModule } from './player/player.module';
import { ProjectionsModule } from './projections/projections.module';
import { TradeModule } from './trade/trade.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    LeagueModule,
    LineupModule,
    PlayerModule,
    ProjectionsModule,
    TradeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
