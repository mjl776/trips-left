import { Controller, Get, Query } from '@nestjs/common';
import { PlayerService } from './player.service';
import {
  Player,
  PlayerSeasonOverview,
  PlayerStatRank,
  PlayerStatRankQuery,
  ViewPlayerQuery,
} from './player.models';

@Controller()
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get('players')
  getPlayers(): Promise<Player[]> {
    return this.playerService.getPlayers();
  }

  @Get('view-player')
  viewPlayer(@Query() query: ViewPlayerQuery): Promise<PlayerSeasonOverview> {
    return this.playerService.viewPlayer(query);
  }

  @Get('player-stat-rank')
  getPlayerStatRank(@Query() query: PlayerStatRankQuery): Promise<PlayerStatRank> {
    return this.playerService.getPlayerStatRank(query);
  }
}
