import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { LeagueController } from './league.controller';
import { LeagueService } from './league.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeagueController],
  providers: [LeagueService],
})
export class LeagueModule {}
