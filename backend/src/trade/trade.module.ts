import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { TradeController } from './trade.controller';
import { TradeService } from './trade.service';

@Module({
  imports: [PrismaModule],
  controllers: [TradeController],
  providers: [TradeService],
})
export class TradeModule {}
