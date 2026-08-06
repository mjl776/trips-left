import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";
import type { PlayerStats } from "@/components/LineupSlotsList";
import { API_BASE_URL } from "@/lib/api";
import { getStarterLabels, buildStarterAssignments } from "@/lib/lineupSections";
import { fetchPlayerStatsByPlayerId, PROJECTION_BASE_SEASON } from "@/lib/playerStats";

const NO_SCORE_POSITIONS = ["K", "DEF"];

export function computeStarterPointsTotal(
  starterAssignments: Record<string, AddPlayerOverlayPlayer>,
  statsByPlayerId: Record<string, PlayerStats>,
): number {
  return Object.values(starterAssignments).reduce((total, player) => {
    if (NO_SCORE_POSITIONS.includes(player.position)) return total;
    const stats = statsByPlayerId[player.playerId];
    return stats ? total + stats.totalPoints : total;
  }, 0);
}

export async function fetchStarterPointsTotal(rosterId: string, leagueId: string): Promise<number | null> {
  const response = await fetch(`${API_BASE_URL}/view-lineup?${new URLSearchParams({ rosterId, leagueId })}`);
  if (!response.ok) return null;

  const data = await response.json();
  const starterLabels = getStarterLabels(data.league.rosterPositions);
  const assignments = buildStarterAssignments(starterLabels, data.rosterPlayers);
  const playerIds = Object.values(assignments).map((player) => player.playerId);
  if (playerIds.length === 0) return 0;

  const stats = await fetchPlayerStatsByPlayerId(playerIds, PROJECTION_BASE_SEASON, leagueId);
  return computeStarterPointsTotal(assignments, stats);
}
