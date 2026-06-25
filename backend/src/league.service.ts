import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';
import { DEFAULT_SCORING_SETTINGS, League, LeagueSettings, ScoringSettings } from './models/league.models';

function toScoringSettings(json: unknown): ScoringSettings {
  return json as ScoringSettings;
}

function toLeague(record: Omit<League, 'scoringSettings'> & { scoringSettings: unknown }): League {
  return { ...record, scoringSettings: toScoringSettings(record.scoringSettings) };
}

@Injectable()
export class LeagueService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello from League Service!';
  }

  async postMockLeague(): Promise<League> {
    const mockLeague = await this.prisma.league.create({
      data: {
        leagueId: randomUUID(),
        name: 'Mock League',
        season: 2026,
        scoringSettings: DEFAULT_SCORING_SETTINGS,
        rosterPositions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN'],
        numTeams: 1,
        isMock: true,
      },
    });

    return toLeague(mockLeague);
  }

  async importSleeperLeague(leagueId: string): Promise<League> {
    const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`);
    if (response.ok) {
      const data = await response.json();
      if (data) {
        const created = await this.prisma.league.create({
          data: {
            leagueId: leagueId,
            name: data.name,
            season: Number(data.season),
            scoringSettings: data.scoring_settings,
            rosterPositions: data.roster_positions,
            numTeams: data.total_rosters,
            isMock: false,
          },
        });
        return toLeague(created);
      }
    }
    throw new NotFoundException(`Sleeper league ${leagueId} not found`);
  }

  async getLeagueSettings(leagueId: string): Promise<LeagueSettings> {
    const result = await this.prisma.league.findUnique({
      where: { leagueId },
      select: { rosterPositions: true, scoringSettings: true },
    });
    if (!result) {
      throw new NotFoundException(`Sleeper league ${leagueId} not found`);
    }

    return { ...result, scoringSettings: toScoringSettings(result.scoringSettings) };
  }

  // Differed: Not critical to current core functionality
  async modifyMockLeagueSettings(leagueId: string): Promise<void> {
    return;
  }

}
