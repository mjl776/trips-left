import { Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LeagueService } from './league.service';
import { League, LeagueSettings } from './models/league.models';

@Controller()
export class LeagueController {
  constructor(private readonly leagueService: LeagueService) {}

  @Get()
  getHello(): string {
    return this.leagueService.getHello();
  }

  @Post('create-mock-league')
  postMockLeague(): Promise<League> {
    return this.leagueService.postMockLeague();
  }

  @Post('import-sleeper-league/:leagueId')
  postImportSleeperLeague(@Param('leagueId') leagueId: string): Promise<League> {
    return this.leagueService.importSleeperLeague(leagueId);
  }

  @Get('view-sleeper-league/:leagueId')
  getSleeperLeague(@Param('leagueId') leagueId: string): Promise<LeagueSettings> {
    return this.leagueService.getLeagueSettings(leagueId);
  }

  @Patch('update-mock-league-settings/:leagueId')
  updateSleeperMockLeagueSettings(@Param('leagueId') leagueId: string): Promise<void> {
    return this.leagueService.modifyMockLeagueSettings(leagueId);
  }

}

