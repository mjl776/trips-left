import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { LeagueModule } from './league.module';

@Module({
  imports: [PrismaModule, LeagueModule],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
