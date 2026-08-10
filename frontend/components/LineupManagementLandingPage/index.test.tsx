import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import LineupManagementLandingPage from "./index";
import { saveLineup } from "@/lib/savedLineups";

const rosterPlayers = [
    { slot: "QB", player: { playerId: "p1", fullName: "QB One", position: "QB", team: "AAA" } },
    { slot: "RB", player: { playerId: "p2", fullName: "RB One", position: "RB", team: "BBB" } },
    { slot: "K", player: { playerId: "p3", fullName: "K One", position: "K", team: "CCC" } },
    { slot: "DEF", player: { playerId: "p4", fullName: "DEF One", position: "DEF", team: null } },
];

const playerStats: Record<string, { totalPoints: number; position: string }> = {
    p1: { totalPoints: 20, position: "QB" },
    p2: { totalPoints: 15, position: "RB" },
    p3: { totalPoints: 0, position: "K" },
    p4: { totalPoints: 0, position: "DEF" },
};

function stubFetch() {
    vi.stubGlobal(
        "fetch",
        vi.fn((input: string) => {
            const url = String(input);
            if (url.includes("/view-lineup")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        league: { rosterPositions: ["QB", "RB", "K", "DEF", "BN"] },
                        rosterPlayers,
                    }),
                });
            }
            const match = url.match(/playerId=([^&]+)/);
            const playerId = match ? match[1] : undefined;
            const stats = playerId ? playerStats[playerId] : undefined;
            if (!stats) {
                return Promise.resolve({ ok: false, json: async () => ({}) });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    fullName: "Player",
                    gamesPlayed: 16,
                    position: stats.position,
                    season: 2025,
                    team: "AAA",
                    totalPoints: stats.totalPoints,
                    positionRank: 1,
                    positionPlayerCount: 10,
                }),
            });
        }),
    );
}

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("LineupManagementLandingPage", () => {
    it("renders the empty state with just the create-lineup card", async () => {
        stubFetch();
        render(<LineupManagementLandingPage />);

        await waitFor(() => expect(screen.getByText("0 lineups")).toBeInTheDocument());
        expect(screen.getByRole("link", { name: "Create a lineup" })).toBeInTheDocument();
    });

    it("uses singular 'lineup' label for exactly one saved lineup", async () => {
        stubFetch();
        saveLineup({
            rosterId: "roster-1",
            leagueId: "league-1",
            name: "Solo Squad",
            isMock: true,
            createdAt: "2026-01-01T00:00:00.000Z",
        });

        render(<LineupManagementLandingPage />);

        await waitFor(() => expect(screen.getByText("1 lineup")).toBeInTheDocument());
        expect(screen.getByText("Solo Squad")).toBeInTheDocument();
    });

    it("lists saved lineups and resolves each starter point total, excluding K/DEF", async () => {
        stubFetch();
        saveLineup({
            rosterId: "roster-1",
            leagueId: "league-1",
            name: "Squad One",
            isMock: true,
            createdAt: "2026-01-01T00:00:00.000Z",
        });
        saveLineup({
            rosterId: "roster-2",
            leagueId: "league-2",
            name: "Squad Two",
            isMock: false,
            createdAt: "2026-01-02T00:00:00.000Z",
        });

        render(<LineupManagementLandingPage />);

        await waitFor(() => expect(screen.getByText("2 lineups")).toBeInTheDocument());
        expect(screen.getByText("Squad One")).toBeInTheDocument();
        expect(screen.getByText("Squad Two")).toBeInTheDocument();

        // QB (20) + RB (15); K/DEF excluded even though present in the lineup.
        await waitFor(() => expect(screen.getAllByText("35.0")).toHaveLength(2));
    });

    it("shows an em-dash for a lineup whose point total fetch fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
        saveLineup({
            rosterId: "roster-3",
            leagueId: "league-3",
            name: "Broken Squad",
            isMock: true,
            createdAt: "2026-01-01T00:00:00.000Z",
        });

        render(<LineupManagementLandingPage />);

        await waitFor(() => expect(screen.getByText("Broken Squad")).toBeInTheDocument());
        expect(screen.getByText("—")).toBeInTheDocument();
    });
});
