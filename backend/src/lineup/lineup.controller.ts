import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { LineupService } from './lineup.service';
import {
  AddDropPlayerInput,
  AddPlayerInput,
  CreateLineupInput,
  GetLineupInput,
  RemovePlayerInput,
  SwapPlayersInput,
} from './lineup.models';

@Controller()
export class LineupController {
  constructor(private readonly lineupService: LineupService) {}

  @Post('create-lineup')
  postLineup(@Body() input: CreateLineupInput) {
    return this.lineupService.createLineup(input);
  }

  @Post('add-player')
  addPlayer(@Body() input: AddPlayerInput) {
    return this.lineupService.addPlayer(input);
  }

  @Post('add-drop-player')
  addDropPlayer(@Body() input: AddDropPlayerInput) {
    return this.lineupService.addDropPlayer(input);
  }

  @Delete('remove-player')
  deleteLineup(@Body() input: RemovePlayerInput) {
    return this.lineupService.deletePlayer(input);
  }

  @Post('swap-players')
  swapPlayers(@Body() input: SwapPlayersInput) {
    return this.lineupService.swapSlots(input);
  }

  @Get('view-lineup')
  viewLineup(@Query() input: GetLineupInput) {
    return this.lineupService.viewLineup(input)
  }

}
