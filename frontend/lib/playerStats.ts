import type { PlayerStats } from "@/components/LineupSlotsList";
import { API_BASE_URL } from "@/lib/api";

// The NFL season the app reads stats for. Point totals are this season's real
// totals so far (see PlayerSeasonOverview on the backend) — there's no
// forward-projection model yet. Bump this when a new season starts.
export const CURRENT_SEASON = 2026;

export async function fetchPlayerStatsByPlayerId(
  playerIds: string[],
  season: number,
  leagueId?: string | null,
): Promise<Record<string, PlayerStats>> {
  const uniqueIds = [...new Set(playerIds)];

  const entries = await Promise.all(
    uniqueIds.map(async (playerId) => {
      const params = new URLSearchParams({ playerId, season: String(season) });
      if (leagueId) params.set("leagueId", leagueId);

      const response = await fetch(`${API_BASE_URL}/view-player?${params}`);
      if (!response.ok) return null;

      const data: PlayerStats = await response.json();
      return [playerId, data] as const;
    }),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is [string, PlayerStats] => entry !== null),
  );
}
