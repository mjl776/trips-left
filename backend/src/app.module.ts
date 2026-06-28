import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { LeagueModule } from './league/league.module';
import { LineupModule } from './lineup/lineup.module';
import { PlayerModule } from './player/player.module';
import { ProjectionsModule } from './projections/projections.module';

@Module({
  imports: [
    PrismaModule,
    LeagueModule,
    LineupModule,
    PlayerModule,
    ProjectionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
