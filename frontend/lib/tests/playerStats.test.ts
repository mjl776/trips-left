import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPlayerStatsByPlayerId, PROJECTION_BASE_SEASON } from "../playerStats";

function mockFetchImplementation(okByPlayerId: Record<string, boolean> = {}) {
  return vi.fn(async (input: string | URL) => {
    const url = new URL(String(input), "http://example.com");
    const playerId = url.searchParams.get("playerId")!;
    const ok = okByPlayerId[playerId] ?? true;

    return {
      ok,
      json: async () => ({ playerId, totalPoints: 12.3 }),
    } as Response;
  });
}

describe("PROJECTION_BASE_SEASON", () => {
  it("is 2025", () => {
    expect(PROJECTION_BASE_SEASON).toBe(2025);
  });
});

describe("fetchPlayerStatsByPlayerId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches each unique player id and returns a map keyed by playerId", async () => {
    const fetchMock = mockFetchImplementation();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPlayerStatsByPlayerId(["p1", "p2"], 2025);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      p1: { playerId: "p1", totalPoints: 12.3 },
      p2: { playerId: "p2", totalPoints: 12.3 },
    });
  });

  it("de-duplicates repeated player ids into a single fetch", async () => {
    const fetchMock = mockFetchImplementation();
    vi.stubGlobal("fetch", fetchMock);

    await fetchPlayerStatsByPlayerId(["p1", "p1", "p1"], 2025);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("omits players whose request did not respond ok", async () => {
    const fetchMock = mockFetchImplementation({ p1: true, p2: false });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPlayerStatsByPlayerId(["p1", "p2"], 2025);

    expect(result).toEqual({ p1: { playerId: "p1", totalPoints: 12.3 } });
  });

  it("includes leagueId in the query string when provided, and omits it otherwise", async () => {
    const fetchMock = mockFetchImplementation();
    vi.stubGlobal("fetch", fetchMock);

    await fetchPlayerStatsByPlayerId(["p1"], 2025, "league-1");
    const [urlWithLeague] = fetchMock.mock.calls[0];
    expect(String(urlWithLeague)).toContain("leagueId=league-1");

    await fetchPlayerStatsByPlayerId(["p1"], 2025, null);
    const [urlWithoutLeague] = fetchMock.mock.calls[1];
    expect(String(urlWithoutLeague)).not.toContain("leagueId");
  });

  it("returns an empty object when no player ids are given", async () => {
    const fetchMock = mockFetchImplementation();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPlayerStatsByPlayerId([], 2025);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
