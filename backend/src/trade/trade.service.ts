import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ScoringSettings } from '../league/league.models';
import {
  SimulateTradeRequest,
  SimulateTradeResponse,
  TradePlayer,
  TradeSimulation,
} from './trade.models';
import {
  calculateFantasyPoints,
  decimalToNumber,
  realizedToStatLine,
} from '../projections/scoring';

// nflverse's player_stats includes the real NFL postseason (weeks 19-22),
// which fantasy leagues don't score. Excluded by default.
const REGULAR_SEASON_WEEKS = 18;

type PlayerSide = TradePlayer & { weeklyPoints: number[] };

function toTradePlayer(side: PlayerSide): TradePlayer {
  return {
    playerId: side.playerId,
    fullName: side.fullName,
    position: side.position,
    team: side.team,
    value: side.value,
    efficiency: side.efficiency,
    weeksPlayed: side.weeksPlayed,
  };
}

@Injectable()
export class TradeService {
  constructor(private readonly prisma: PrismaService) {}

  async simulateTrade({
    leagueId,
    season,
    playerOutId,
    playerInId,
  }: SimulateTradeRequest): Promise<SimulateTradeResponse> {
    const league = await this.prisma.league.findUnique({ where: { leagueId } });
    if (!league) {
      throw new NotFoundException(`League ${leagueId} not found`);
    }
    const scoringSettings =
      league.scoringSettings as unknown as ScoringSettings;

    const [playerOut, playerIn] = await Promise.all([
      this.buildPlayerSide(playerOutId, season, scoringSettings),
      this.buildPlayerSide(playerInId, season, scoringSettings),
    ]);

    const roi =
      playerOut.value === 0
        ? null
        : ((playerIn.value - playerOut.value) / playerOut.value) * 100;

    const simulation = await this.runSimulation(playerOut, playerIn);

    return {
      playerOut: toTradePlayer(playerOut),
      playerIn: toTradePlayer(playerIn),
      roi,
      simulation: simulation.result,
      ...(simulation.error ? { error: simulation.error } : {}),
    };
  }

  private async buildPlayerSide(
    playerId: string,
    season: number,
    scoringSettings: ScoringSettings,
  ): Promise<PlayerSide> {
    const player = await this.prisma.player.findUnique({ where: { playerId } });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    const statRows = await this.prisma.playerStats.findMany({
      where: { playerId, season, week: { lte: REGULAR_SEASON_WEEKS } },
    });

    const weeklyPoints = statRows.map((row) =>
      calculateFantasyPoints(realizedToStatLine(row), scoringSettings),
    );
    const value = weeklyPoints.reduce((sum, points) => sum + points, 0);

    const opportunities = statRows.reduce(
      (sum, row) =>
        sum +
        (decimalToNumber(row.targets) ?? 0) +
        (decimalToNumber(row.carries) ?? 0) +
        (decimalToNumber(row.attempts) ?? 0),
      0,
    );
    const efficiency = opportunities === 0 ? null : value / opportunities;

    return {
      playerId: player.playerId,
      fullName: player.fullName,
      position: player.position,
      team: player.team,
      value,
      efficiency,
      weeksPlayed: statRows.length,
      weeklyPoints,
    };
  }

  private async runSimulation(
    playerOut: PlayerSide,
    playerIn: PlayerSide,
  ): Promise<{ result: TradeSimulation | null; error?: string }> {
    const simulationServiceUrl = process.env.SIMULATION_SERVICE_URL?.replace(
      /\/+$/,
      '',
    );
    if (!simulationServiceUrl) {
      return { result: null, error: 'simulation_unavailable' };
    }

    try {
      const response = await fetch(`${simulationServiceUrl}/simulate-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_out: {
            player_id: playerOut.playerId,
            weekly_points: playerOut.weeklyPoints,
          },
          player_in: {
            player_id: playerIn.playerId,
            weekly_points: playerIn.weeklyPoints,
          },
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return { result: null, error: 'simulation_unavailable' };
      }

      const data = await response.json();
      return {
        result: {
          expectedDelta: data.expected_delta,
          winProbability: data.win_probability,
          percentiles: {
            p10: data.percentiles.p10,
            p50: data.percentiles.p50,
            p90: data.percentiles.p90,
          },
        },
      };
    } catch {
      return { result: null, error: 'simulation_unavailable' };
    }
  }
}
