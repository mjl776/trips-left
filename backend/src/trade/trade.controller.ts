import { Body, Controller, Post } from '@nestjs/common';
import { TradeService } from './trade.service';
import { SimulateTradeRequest, SimulateTradeResponse } from './trade.models';

@Controller()
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Post('simulate-trade')
  simulateTrade(
    @Body() input: SimulateTradeRequest,
  ): Promise<SimulateTradeResponse> {
    return this.tradeService.simulateTrade(input);
  }
}
