import { afterEach, describe, expect, it, vi } from "vitest";
import { computeStarterPointsTotal, fetchStarterPointsTotal } from "../lineupTotals";
import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";
import type { PlayerStats } from "@/components/LineupSlotsList";

const qb: AddPlayerOverlayPlayer = { playerId: "qb-1", fullName: "QB One", position: "QB", team: "AAA" };
const kicker: AddPlayerOverlayPlayer = { playerId: "k-1", fullName: "Kicker One", position: "K", team: "BBB" };
const defense: AddPlayerOverlayPlayer = { playerId: "def-1", fullName: "Defense One", position: "DEF", team: "CCC" };

describe("computeStarterPointsTotal", () => {
  it("sums totalPoints across starters with known stats", () => {
    const assignments = { "starter-0": qb };
    const stats: Record<string, PlayerStats> = {
      "qb-1": { totalPoints: 20 } as PlayerStats,
    };

    expect(computeStarterPointsTotal(assignments, stats)).toBe(20);
  });

  it("excludes K and DEF from the total even if stats exist for them", () => {
    const assignments = { "starter-0": kicker, "starter-1": defense };
    const stats: Record<string, PlayerStats> = {
      "k-1": { totalPoints: 9 } as PlayerStats,
      "def-1": { totalPoints: 7 } as PlayerStats,
    };

    expect(computeStarterPointsTotal(assignments, stats)).toBe(0);
  });

  it("treats a starter with no matching stats entry as contributing 0", () => {
    const assignments = { "starter-0": qb };

    expect(computeStarterPointsTotal(assignments, {})).toBe(0);
  });
});

describe("fetchStarterPointsTotal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the lineup, then sums starter points from the stats endpoint", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("/view-lineup")) {
        return {
          ok: true,
          json: async () => ({
            league: { rosterPositions: ["QB", "BN"] },
            rosterPlayers: [{ slot: "QB", player: qb }],
          }),
        } as Response;
      }

      if (url.includes("/view-player")) {
        return {
          ok: true,
          json: async () => ({ playerId: "qb-1", totalPoints: 18 }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const total = await fetchStarterPointsTotal("roster-1", "league-1");

    expect(total).toBe(18);
  });

  it("returns null when the lineup fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false }) as Response));

    const total = await fetchStarterPointsTotal("roster-1", "league-1");

    expect(total).toBeNull();
  });

  it("returns 0 without a stats fetch when there are no starter assignments", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ league: { rosterPositions: ["BN"] }, rosterPlayers: [] }),
    } as Response));
    vi.stubGlobal("fetch", fetchMock);

    const total = await fetchStarterPointsTotal("roster-1", "league-1");

    expect(total).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
