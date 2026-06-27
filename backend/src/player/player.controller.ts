import { Controller, Get } from '@nestjs/common';
import { PlayerService } from './player.service';
import { Player } from './player.models';

@Controller()
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get('players')
  getPlayers(): Promise<Player[]> {
    return this.playerService.getPlayers();
  }
}
