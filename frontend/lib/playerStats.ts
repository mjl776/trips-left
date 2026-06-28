import type { playerStats } from "@/components/LineupSlotsList";

// "Projected points" = last season's real totals (see PlayerSeasonOverview on
// the backend) — there's no forward-projection model yet, so this is the
// simplest baseline: most recent season with real ingested stats.
export const PROJECTION_BASE_SEASON = 2025;

export async function fetchPlayerStatsByPlayerId(
  playerIds: string[],
  season: number,
  leagueId?: string | null,
): Promise<Record<string, playerStats>> {
  const uniqueIds = [...new Set(playerIds)];

  const entries = await Promise.all(
    uniqueIds.map(async (playerId) => {
      const params = new URLSearchParams({ playerId, season: String(season) });
      if (leagueId) params.set("leagueId", leagueId);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/view-player?${params}`);
      if (!response.ok) return null;

      const data: playerStats = await response.json();
      return [playerId, data] as const;
    }),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is [string, playerStats] => entry !== null),
  );
}
