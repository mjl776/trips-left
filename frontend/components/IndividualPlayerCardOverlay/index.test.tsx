import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import IndividualPlayerCardOverlay from "./index";
import type { PlayerStats } from "@/components/LineupSlotsList";
import type { PlayerStatRank } from "@/types/PlayerTypes";

function stubFetch(handlers: {
    viewPlayer?: PlayerStats | null;
    statRanks?: Record<string, PlayerStatRank | null>;
}) {
    const fetchMock = vi.fn((url: string) => {
        if (url.includes("/view-player")) {
            if (handlers.viewPlayer === null) return Promise.resolve({ ok: false });
            return Promise.resolve({ ok: true, json: async () => handlers.viewPlayer });
        }
        if (url.includes("/player-stat-rank")) {
            const params = new URLSearchParams(url.split("?")[1]);
            const stat = params.get("stat") ?? "";
            const rank = handlers.statRanks?.[stat];
            if (!rank) return Promise.resolve({ ok: false });
            return Promise.resolve({ ok: true, json: async () => rank });
        }
        return Promise.resolve({ ok: false });
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

const qbStats: PlayerStats = {
    fullName: "Alpha Quarterback",
    gamesPlayed: 17,
    position: "QB",
    season: 2025,
    team: "BUF",
    totalPoints: 312.4,
    positionRank: 3,
    positionPlayerCount: 32,
};

const wrStats: PlayerStats = {
    fullName: "Bravo Receiver",
    gamesPlayed: 15,
    position: "WR",
    season: 2025,
    team: "MIN",
    totalPoints: 198.7,
    positionRank: 8,
    positionPlayerCount: 64,
};

const kStats: PlayerStats = {
    fullName: "Charlie Kicker",
    gamesPlayed: 17,
    position: "K",
    season: 2025,
    team: "BAL",
    totalPoints: 0,
    positionRank: null,
    positionPlayerCount: 0,
};

const defStats: PlayerStats = {
    fullName: "Delta Defense",
    gamesPlayed: 17,
    position: "DEF",
    season: 2025,
    team: null,
    totalPoints: 0,
    positionRank: null,
    positionPlayerCount: 0,
};

const freeAgentStats: PlayerStats = {
    fullName: "Echo Freeagent",
    gamesPlayed: null,
    position: "LB",
    season: 2025,
    team: null,
    totalPoints: 0,
    positionRank: null,
    positionPlayerCount: 0,
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("IndividualPlayerCardOverlay", () => {
    it("renders nothing but the backdrop while the player fetch is pending", () => {
        vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

        const { container } = render(
            <IndividualPlayerCardOverlay playerId="p1" leagueId={null} season={2025} onClose={vi.fn()} />,
        );

        expect(screen.queryByText(/FANTASY PTS/)).not.toBeInTheDocument();
        expect(container.querySelector('[class*="playerCard"]')).toBeInTheDocument();
    });

    it("renders player tiles and ranked advanced stats for a QB", async () => {
        stubFetch({
            viewPlayer: qbStats,
            statRanks: {
                passingAirYards: {
                    playerId: "p1",
                    fullName: qbStats.fullName,
                    position: "QB",
                    team: "BUF",
                    season: 2025,
                    stat: "passingAirYards",
                    value: 4321,
                    gamesCounted: 17,
                    positionRank: 5,
                    positionPlayerCount: 32,
                },
                passingCpoe: {
                    playerId: "p1",
                    fullName: qbStats.fullName,
                    position: "QB",
                    team: "BUF",
                    season: 2025,
                    stat: "passingCpoe",
                    value: 0.021,
                    gamesCounted: 17,
                    positionRank: 20,
                    positionPlayerCount: 32,
                },
            },
        });

        render(<IndividualPlayerCardOverlay playerId="p1" leagueId="league-1" season={2025} onClose={vi.fn()} />);

        await screen.findByText("Alpha Quarterback");
        expect(screen.getByText(/BUF · QB · 2025 season/)).toBeInTheDocument();
        expect(screen.getByText("312.4")).toBeInTheDocument();
        expect(screen.getByText("17")).toBeInTheDocument();
        expect(screen.getByText("#3/32")).toBeInTheDocument();

        // The stat-rank calls resolve after an additional microtask past the
        // view-player fetch, so wait for the advanced-metrics section too.
        await screen.findByText("Passing air yards");
        // The formatted value and percentile share one text node ("4,321 · 88th percentile"),
        // so match on substring rather than the full node text.
        expect(screen.getByText("4,321", { exact: false })).toBeInTheDocument();
        expect(screen.getByText("#5 of 32")).toBeInTheDocument();
        // (32 - 5 + 1) / 32 = 87.5% -> rounds to 88th percentile
        expect(screen.getByText("88th percentile", { exact: false })).toBeInTheDocument();

        expect(screen.getByText("CPOE")).toBeInTheDocument();
        expect(screen.getByText("+2.1%", { exact: false })).toBeInTheDocument();
        expect(screen.getByText("#20 of 32")).toBeInTheDocument();
    });

    it("formats WR advanced stats (target share, air yards, WOPR) and marks a low positional rank as not top tier", async () => {
        stubFetch({
            viewPlayer: wrStats,
            statRanks: {
                targetShare: {
                    playerId: "p2",
                    fullName: wrStats.fullName,
                    position: "WR",
                    team: "MIN",
                    season: 2025,
                    stat: "targetShare",
                    value: 0.245,
                    gamesCounted: 15,
                    positionRank: 45,
                    positionPlayerCount: 64,
                },
                receivingAirYards: {
                    playerId: "p2",
                    fullName: wrStats.fullName,
                    position: "WR",
                    team: "MIN",
                    season: 2025,
                    stat: "receivingAirYards",
                    value: 1502.6,
                    gamesCounted: 15,
                    positionRank: 12,
                    positionPlayerCount: 64,
                },
                wopr: {
                    playerId: "p2",
                    fullName: wrStats.fullName,
                    position: "WR",
                    team: "MIN",
                    season: 2025,
                    stat: "wopr",
                    value: 0.612,
                    gamesCounted: 15,
                    positionRank: 30,
                    positionPlayerCount: 64,
                },
            },
        });

        render(<IndividualPlayerCardOverlay playerId="p2" leagueId={null} season={2025} onClose={vi.fn()} />);

        // Wait for the (asynchronous) stat-rank fetches to land before asserting on them.
        await screen.findByText("Target share");
        expect(screen.getByText("24.5%", { exact: false })).toBeInTheDocument();
        expect(screen.getByText("Receiving air yards")).toBeInTheDocument();
        expect(screen.getByText("1,503", { exact: false })).toBeInTheDocument();
        expect(screen.getByText("WOPR")).toBeInTheDocument();
        expect(screen.getByText("0.61", { exact: false })).toBeInTheDocument();

        // positionRank 12 is the top-tier boundary (<=12)
        const airYardsRank = screen.getByText("#12 of 64");
        expect(airYardsRank.className).toMatch(/statRankTop/);
        // positionRank 45 is well outside top tier
        const targetShareRank = screen.getByText("#45 of 64");
        expect(targetShareRank.className).toMatch(/statRank(?!Top)/);
    });

    it("filters out a stat rank whose value is null", async () => {
        stubFetch({
            viewPlayer: wrStats,
            statRanks: {
                targetShare: {
                    playerId: "p2",
                    fullName: wrStats.fullName,
                    position: "WR",
                    team: "MIN",
                    season: 2025,
                    stat: "targetShare",
                    value: null,
                    gamesCounted: 0,
                    positionRank: null,
                    positionPlayerCount: 64,
                },
                receivingAirYards: {
                    playerId: "p2",
                    fullName: wrStats.fullName,
                    position: "WR",
                    team: "MIN",
                    season: 2025,
                    stat: "receivingAirYards",
                    value: 900,
                    gamesCounted: 15,
                    positionRank: 40,
                    positionPlayerCount: 64,
                },
                wopr: null,
            },
        });

        render(<IndividualPlayerCardOverlay playerId="p2" leagueId={null} season={2025} onClose={vi.fn()} />);

        // Wait for the async stat-rank effect to settle before asserting on its result.
        await screen.findByText("Receiving air yards");
        expect(screen.queryByText("Target share")).not.toBeInTheDocument();
        expect(screen.queryByText("WOPR")).not.toBeInTheDocument();
    });

    it("shows the neutral K/DEF empty state instead of fetching stat ranks", async () => {
        const fetchMock = stubFetch({ viewPlayer: kStats });

        render(<IndividualPlayerCardOverlay playerId="p3" leagueId={null} season={2025} onClose={vi.fn()} />);

        await screen.findByText("Charlie Kicker");
        expect(
            await screen.findByText(
                "No advanced metrics are ranked for Ks — the stats table has no field-goal or points-allowed columns yet, so kickers and defenses have no rankable production.",
            ),
        ).toBeInTheDocument();
        expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/player-stat-rank"))).toBe(false);
    });

    it("shows the neutral empty state worded for DEF", async () => {
        stubFetch({ viewPlayer: defStats });

        render(<IndividualPlayerCardOverlay playerId="p4" leagueId={null} season={2025} onClose={vi.fn()} />);

        await screen.findByText("Delta Defense");
        expect(screen.getByText(/No advanced metrics are ranked for DEFs/)).toBeInTheDocument();
        expect(screen.getByText(/Free agent · DEF · 2025 season/)).toBeInTheDocument();
    });

    it("shows the generic empty-stats copy for a position outside POSITION_RANKABLE_STATS", async () => {
        stubFetch({ viewPlayer: freeAgentStats });

        render(<IndividualPlayerCardOverlay playerId="p5" leagueId={null} season={2025} onClose={vi.fn()} />);

        await screen.findByText("Echo Freeagent");
        expect(screen.getByText("No advanced metrics available for this player yet.")).toBeInTheDocument();
    });

    it("falls back to em dashes for missing games and position rank", async () => {
        stubFetch({ viewPlayer: freeAgentStats });

        render(<IndividualPlayerCardOverlay playerId="p5" leagueId={null} season={2025} onClose={vi.fn()} />);

        await screen.findByText("Echo Freeagent");
        const dashes = screen.getAllByText("—");
        // one for GAMES, one for POS RANK
        expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it("closes when the Escape key is pressed", () => {
        vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
        const onClose = vi.fn();

        render(<IndividualPlayerCardOverlay playerId="p1" leagueId={null} season={2025} onClose={onClose} />);
        fireEvent.keyDown(window, { key: "Escape" });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes on backdrop click but not when the card itself is clicked", async () => {
        stubFetch({ viewPlayer: qbStats, statRanks: {} });
        const onClose = vi.fn();

        const { container } = render(
            <IndividualPlayerCardOverlay playerId="p1" leagueId={null} season={2025} onClose={onClose} />,
        );

        await screen.findByText("Alpha Quarterback");

        const card = container.querySelector('[class*="playerCard"]') as HTMLElement;
        fireEvent.click(card);
        expect(onClose).not.toHaveBeenCalled();

        const backdrop = container.querySelector('[class*="backdrop"]') as HTMLElement;
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes via the close button", async () => {
        stubFetch({ viewPlayer: qbStats, statRanks: {} });
        const onClose = vi.fn();

        render(<IndividualPlayerCardOverlay playerId="p1" leagueId={null} season={2025} onClose={onClose} />);

        await screen.findByText("Alpha Quarterback");
        fireEvent.click(screen.getByRole("button", { name: "Close" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("silently stays empty when the view-player request fails", async () => {
        stubFetch({ viewPlayer: null });

        render(<IndividualPlayerCardOverlay playerId="p1" leagueId={null} season={2025} onClose={vi.fn()} />);

        await waitFor(() => expect(fetch).toHaveBeenCalled());
        expect(screen.queryByText(/FANTASY PTS/)).not.toBeInTheDocument();
    });
});
