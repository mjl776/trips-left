import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AddPlayerOverlayPlayer } from "../AddPlayerOverlay";
import type { PlayerStats } from "../LineupSlotsList";
import type { LineupInsights } from "@/types/PlayerTypes";

vi.mock("next/navigation", () => ({
    useSearchParams: vi.fn(),
}));

import { useSearchParams } from "next/navigation";
import ViewLineupPanel from "./index";

type RosterPlayerFixture = {
    slot: string;
    player: AddPlayerOverlayPlayer;
};

type RosterFixture = {
    name: string;
    league: { name: string; rosterPositions: string[] };
    rosterPlayers: RosterPlayerFixture[];
};

function makeRoster(): RosterFixture {
    return {
        name: "Championship Squad",
        league: {
            name: "Dynasty League",
            rosterPositions: ["QB", "RB", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN"],
        },
        rosterPlayers: [
            { slot: "QB", player: { playerId: "qb1", fullName: "Josh Allen", position: "QB", team: "BUF" } },
            { slot: "RB", player: { playerId: "rb1", fullName: "Bijan Robinson", position: "RB", team: "ATL" } },
            { slot: "WR", player: { playerId: "wr1", fullName: "Justin Jefferson", position: "WR", team: "MIN" } },
            { slot: "TE", player: { playerId: "te1", fullName: "Sam LaPorta", position: "TE", team: "DET" } },
            { slot: "K", player: { playerId: "k1", fullName: "Justin Tucker", position: "K", team: "BAL" } },
            { slot: "DEF", player: { playerId: "def1", fullName: "49ers DEF", position: "DEF", team: "SF" } },
            { slot: "BN", player: { playerId: "bn1", fullName: "Bench Guy", position: "RB", team: "NYJ" } },
            { slot: "BN", player: { playerId: "bn2", fullName: "Bench Two", position: "WR", team: "MIA" } },
        ],
    };
}

function statsFor(
    fullName: string,
    position: string,
    team: string,
    totalPoints: number,
    positionRank: number | null,
): PlayerStats {
    return { fullName, gamesPlayed: 16, position, season: 2025, team, totalPoints, positionRank, positionPlayerCount: 60 };
}

const statsById: Record<string, PlayerStats> = {
    qb1: statsFor("Josh Allen", "QB", "BUF", 410.2, 1),
    rb1: statsFor("Bijan Robinson", "RB", "ATL", 250.5, 4),
    wr1: statsFor("Justin Jefferson", "WR", "MIN", 300.1, 2),
    te1: statsFor("Sam LaPorta", "TE", "DET", 150.0, 8),
    k1: statsFor("Justin Tucker", "K", "BAL", 0, null),
    def1: statsFor("49ers DEF", "DEF", "SF", 0, null),
    bn1: statsFor("Bench Guy", "RB", "NYJ", 90.3, 20),
    bn2: statsFor("Bench Two", "WR", "MIA", 60.0, 45),
};

const populatedInsights: LineupInsights = {
    rosterId: "test-roster",
    leagueId: "test-league",
    season: 2025,
    bestPlayer: { playerId: "qb1", fullName: "Josh Allen", position: "QB", team: "BUF", totalPoints: 410.2 },
    worstPlayer: { playerId: "te1", fullName: "Sam LaPorta", position: "TE", team: "DET", totalPoints: 150.0 },
    darkHorse: {
        playerId: "rb1",
        fullName: "Bijan Robinson",
        position: "RB",
        team: "ATL",
        stat: "rushing_epa",
        value: 45.2,
        leagueThreshold: 30.0,
        positionRank: 4,
        positionPlayerCount: 60,
        percentile: 88,
    },
};

const emptyInsights: LineupInsights = {
    rosterId: "test-roster",
    leagueId: "test-league",
    season: 2025,
    bestPlayer: null,
    worstPlayer: null,
    darkHorse: null,
};

const freeAgents: AddPlayerOverlayPlayer[] = [
    { playerId: "fa-wr", fullName: "Free Agent Receiver", position: "WR", team: "LAR" },
    { playerId: "fa-k", fullName: "Free Agent Kicker", position: "K", team: "DAL" },
];

function jsonResponse(data: unknown, ok = true) {
    return { ok, json: () => Promise.resolve(data) };
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

function getQueryParam(url: string, key: string): string | null {
    return new URLSearchParams(url.split("?")[1] ?? "").get(key);
}

type FetchMockOptions = {
    roster: RosterFixture;
    insights?: LineupInsights | null;
    playersList?: AddPlayerOverlayPlayer[];
    statsById?: Record<string, PlayerStats>;
    removeOutcome?: "success" | "failure";
    swapOutcome?: "success" | "failure";
    lineupOutcome?: "success" | "failure";
    insightsOutcome?: "success" | "failure";
};

function createFetchMock({
    roster,
    insights = null,
    playersList = [],
    statsById: statsMap = {},
    removeOutcome = "success",
    swapOutcome = "success",
    lineupOutcome = "success",
    insightsOutcome = "success",
}: FetchMockOptions) {
    return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method ?? "GET").toUpperCase();

        if (url.includes("/view-lineup")) {
            if (lineupOutcome === "failure") return Promise.resolve(jsonResponse({ message: "server error" }, false));
            // Mirrors the backend: view-lineup embeds each rostered player's season
            // stats server-side (when `season` is passed) instead of the frontend
            // fanning out one GET /view-player per rostered player.
            const rosterWithStats = clone(roster);
            rosterWithStats.rosterPlayers = rosterWithStats.rosterPlayers.map((rosterPlayer: RosterPlayerFixture) => ({
                ...rosterPlayer,
                stats: statsMap[rosterPlayer.player.playerId],
            }));
            return Promise.resolve(jsonResponse(rosterWithStats));
        }
        if (url.includes("/lineup-insights")) {
            if (insightsOutcome === "failure") return Promise.resolve(jsonResponse({ message: "server error" }, false));
            return Promise.resolve(jsonResponse(insights));
        }
        if (url.includes("/view-player")) {
            const playerId = getQueryParam(url, "playerId") ?? "";
            const stats = statsMap[playerId];
            return Promise.resolve(stats ? jsonResponse(stats) : jsonResponse(null, false));
        }
        if (url.includes("/players")) {
            return Promise.resolve(jsonResponse(playersList));
        }
        if (url.includes("/add-player") && method === "POST") {
            const body = JSON.parse(String(init?.body ?? "{}"));
            const player = playersList.find((candidate) => candidate.playerId === body.playerId);
            if (player) roster.rosterPlayers.push({ slot: body.slot, player });
            return Promise.resolve(jsonResponse({ ok: true }));
        }
        if (url.includes("/remove-player") && method === "DELETE") {
            if (removeOutcome === "failure") return Promise.resolve(jsonResponse({ message: "server error" }, false));
            const body = JSON.parse(String(init?.body ?? "{}"));
            roster.rosterPlayers = roster.rosterPlayers.filter(
                (rosterPlayer) => rosterPlayer.player.playerId !== body.playerId,
            );
            return Promise.resolve(jsonResponse({ ok: true }));
        }
        if (url.includes("/swap-players") && method === "POST") {
            if (swapOutcome === "failure") return Promise.resolve(jsonResponse({ message: "server error" }, false));
            const body = JSON.parse(String(init?.body ?? "{}"));
            const playerA = roster.rosterPlayers.find((rp) => rp.player.playerId === body.playerAId);
            const playerB = roster.rosterPlayers.find((rp) => rp.player.playerId === body.playerBId);
            if (playerA && playerB) {
                const swappedSlot = playerA.slot;
                playerA.slot = playerB.slot;
                playerB.slot = swappedSlot;
            }
            return Promise.resolve(jsonResponse({ ok: true }));
        }

        return Promise.resolve(jsonResponse({}, false));
    });
}

let alertMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.mocked(useSearchParams).mockReturnValue(
        new URLSearchParams("rosterId=test-roster&leagueId=test-league") as ReturnType<typeof useSearchParams>,
    );
    alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("ViewLineupPanel", () => {
    it("shows the roster and insights skeletons before load, then populates starters, bench, total points, and verdict badges once the lineup and insights load", async () => {
        vi.stubGlobal(
            "fetch",
            createFetchMock({ roster: makeRoster(), insights: populatedInsights, statsById, playersList: freeAgents }),
        );

        const { container } = render(<ViewLineupPanel />);

        expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(2);
        expect(screen.getAllByText("Loading…")).toHaveLength(2);
        expect(container.querySelectorAll("[data-skeleton]").length).toBeGreaterThan(0);
        expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
        // Insights keep their real tag headers while loading, and never show empty-state copy.
        expect(screen.getByText("BEST PLAYER")).toBeInTheDocument();
        expect(screen.queryByText("No players rostered yet.")).not.toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByRole("heading", { level: 2, name: "Championship Squad" })).toBeInTheDocument();
        });
        expect(screen.getByText("Dynasty League")).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText("1110.8")).toBeInTheDocument());

        // Josh Allen, Bijan Robinson, and Sam LaPorta each render twice: once in their
        // starter row and once as the best/dark-horse/worst player in the sidebar.
        expect(screen.getAllByText("Josh Allen")).toHaveLength(2);
        expect(screen.getAllByText("Bijan Robinson")).toHaveLength(2);
        expect(screen.getAllByText("Sam LaPorta")).toHaveLength(2);
        expect(screen.getByText("Justin Jefferson")).toBeInTheDocument();
        expect(screen.getByText("Justin Tucker")).toBeInTheDocument();
        expect(screen.getByText("49ers DEF")).toBeInTheDocument();
        expect(screen.getByText("Bench Guy")).toBeInTheDocument();
        expect(screen.getByText("Bench Two")).toBeInTheDocument();
        expect(screen.getByText("Empty")).toBeInTheDocument();

        expect(screen.getByText("Best Player").className).toMatch(/cyan/);
        expect(screen.getByText("Worst Player").className).toMatch(/magenta/);
        expect(screen.getByText("Dark Horse").className).toMatch(/cyan/);

        expect(screen.getByText(/Most fantasy points on your roster/)).toBeInTheDocument();
        expect(screen.getByText(/Lowest scorer on the roster/)).toBeInTheDocument();
        expect(screen.getByText(/clears the top-20% cutoff/)).toBeInTheDocument();
        expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
    });

    it("renders the empty-insights state and no verdict badges when bestPlayer, worstPlayer, and darkHorse are all null", async () => {
        vi.stubGlobal("fetch", createFetchMock({ roster: makeRoster(), insights: emptyInsights, statsById }));

        render(<ViewLineupPanel />);
        await waitFor(() => expect(screen.getByText("Josh Allen")).toBeInTheDocument());

        expect(screen.getByText("No players rostered yet.")).toBeInTheDocument();
        expect(
            screen.getByText("Needs at least two rostered players outside K and DEF before a worst player can be named."),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "No rostered QB, RB, WR, or TE outside your best player currently clears the top-20% EPA cutoff for his position.",
            ),
        ).toBeInTheDocument();

        expect(screen.queryByText("Best Player")).not.toBeInTheDocument();
        expect(screen.queryByText("Worst Player")).not.toBeInTheDocument();
        expect(screen.queryByText("Dark Horse")).not.toBeInTheDocument();
    });

    it("opens the add-player overlay for an empty slot, filters eligible players, and adds the selection via POST /add-player", async () => {
        const roster = makeRoster();
        const fetchMock = createFetchMock({ roster, insights: populatedInsights, statsById, playersList: freeAgents });
        vi.stubGlobal("fetch", fetchMock);

        render(<ViewLineupPanel />);
        await waitFor(() => expect(screen.getByText("Empty")).toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: "Add player to FLEX" }));
        // AddPlayerOverlay is now code-split via next/dynamic (Phase 4), so it
        // mounts asynchronously after the click.
        await waitFor(() => expect(screen.getByText("Add FLEX")).toBeInTheDocument());

        // GET /players is deferred until a slot is opened (Phase 4), so the
        // eligible list populates asynchronously after this click.
        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "Free Agent" } });
        await waitFor(() => expect(screen.getByText("Free Agent Receiver")).toBeInTheDocument());
        expect(screen.queryByText("Free Agent Kicker")).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("Free Agent Receiver"));

        await waitFor(() => {
            expect(screen.queryByPlaceholderText("Search players...")).not.toBeInTheDocument();
        });

        const addCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/add-player"))!;
        expect(addCall[1]?.method).toBe("POST");
        expect(JSON.parse(String(addCall[1]?.body))).toEqual({
            rosterId: "test-roster",
            leagueId: "test-league",
            playerId: "fa-wr",
            slot: "FLEX",
        });

        await waitFor(() => expect(screen.getByText("Free Agent Receiver")).toBeInTheDocument());
    });

    it("opens the add-player overlay for an empty bench slot and adds the selection via POST /add-player with slot BN", async () => {
        const roster = makeRoster();
        roster.rosterPlayers = roster.rosterPlayers.filter((rosterPlayer) => rosterPlayer.player.playerId !== "bn2");
        const fetchMock = createFetchMock({ roster, insights: populatedInsights, statsById, playersList: freeAgents });
        vi.stubGlobal("fetch", fetchMock);

        render(<ViewLineupPanel />);
        await waitFor(() => expect(screen.getByText("Empty bench slot")).toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: "Add player to bench" }));
        // AddPlayerOverlay is now code-split via next/dynamic (Phase 4), so it
        // mounts asynchronously after the click.
        await waitFor(() => expect(screen.getByText("Add Bench")).toBeInTheDocument());

        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "Free Agent" } });
        await waitFor(() => expect(screen.getByText("Free Agent Kicker")).toBeInTheDocument());
        fireEvent.click(screen.getByText("Free Agent Kicker"));

        await waitFor(() => {
            expect(screen.queryByPlaceholderText("Search players...")).not.toBeInTheDocument();
        });

        const addCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/add-player"))!;
        expect(addCall[1]?.method).toBe("POST");
        expect(JSON.parse(String(addCall[1]?.body))).toEqual({
            rosterId: "test-roster",
            leagueId: "test-league",
            playerId: "fa-k",
            slot: "BN",
        });

        await waitFor(() => expect(screen.getByText("Free Agent Kicker")).toBeInTheDocument());
        expect(screen.queryByText("Empty bench slot")).not.toBeInTheDocument();
    });

    it("removes a starter player via the remove button, sending a JSON body to DELETE /remove-player and reloading the lineup", async () => {
        const roster = makeRoster();
        // Use the empty-insights fixture so the removed player's name isn't also pinned
        // in the (static, mutation-independent) sidebar copy for this test's mock backend.
        const fetchMock = createFetchMock({ roster, insights: emptyInsights, statsById });
        vi.stubGlobal("fetch", fetchMock);

        render(<ViewLineupPanel />);
        await waitFor(() => expect(screen.getByText("Justin Jefferson")).toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: "Remove player from WR" }));

        await waitFor(() => expect(screen.queryByText("Justin Jefferson")).not.toBeInTheDocument());

        const removeCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/remove-player"))!;
        expect(removeCall[1]?.method).toBe("DELETE");
        expect(JSON.parse(String(removeCall[1]?.body))).toEqual({
            rosterId: "test-roster",
            leagueId: "test-league",
            playerId: "wr1",
        });

        expect(screen.getByRole("button", { name: "Add player to WR" })).toBeInTheDocument();
    });

    it("swaps a bench player into an eligible starter slot via POST /swap-players and reflects the swap after reload", async () => {
        const roster = makeRoster();
        const fetchMock = createFetchMock({ roster, insights: emptyInsights, statsById });
        vi.stubGlobal("fetch", fetchMock);

        render(<ViewLineupPanel />);
        await waitFor(() => expect(screen.getByText("Bench Guy")).toBeInTheDocument());

        // "Bench Guy" (bn1, RB) is the first SWAP button rendered in bench order.
        fireEvent.click(screen.getAllByRole("button", { name: "SWAP" })[0]);
        expect(screen.getByText("Swapping Bench Guy — pick a starter to swap him with.")).toBeInTheDocument();

        // QB is not RB-eligible, so it stays a disabled, non-swap-target row during swap mode.
        expect(screen.getByRole("button", { name: /Josh Allen/ })).toBeDisabled();

        fireEvent.click(screen.getByText("Bijan Robinson"));

        await waitFor(() => expect(screen.queryByText(/Swapping/)).not.toBeInTheDocument());

        const swapCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/swap-players"))!;
        expect(swapCall[1]?.method).toBe("POST");
        expect(JSON.parse(String(swapCall[1]?.body))).toEqual({
            rosterId: "test-roster",
            leagueId: "test-league",
            playerAId: "bn1",
            playerBId: "rb1",
        });

        // Bench Guy moved into the starting lineup, and Bijan Robinson took his place on the
        // bench alongside Bench Two — bench count stays at 2, just with different occupants.
        await waitFor(() => expect(screen.getAllByRole("button", { name: "SWAP" })).toHaveLength(2));
        expect(screen.getByText("Bijan Robinson")).toBeInTheDocument();
        expect(screen.getByText("Bench Two")).toBeInTheDocument();
    });

    it("cancels swap mode without calling POST /swap-players when Cancel is clicked", async () => {
        const roster = makeRoster();
        const fetchMock = createFetchMock({ roster, insights: emptyInsights, statsById });
        vi.stubGlobal("fetch", fetchMock);

        render(<ViewLineupPanel />);
        await waitFor(() => expect(screen.getByText("Bench Guy")).toBeInTheDocument());

        fireEvent.click(screen.getAllByRole("button", { name: "SWAP" })[0]);
        expect(screen.getByText(/Swapping Bench Guy/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.queryByText(/Swapping/)).not.toBeInTheDocument();
        expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/swap-players"))).toBe(false);
        expect(screen.getByRole("button", { name: "Remove player from RB" })).toBeInTheDocument();
    });

    it("drops a bench player via the DROP button, calling DELETE /remove-player with a JSON body", async () => {
        const roster = makeRoster();
        const fetchMock = createFetchMock({ roster, insights: emptyInsights, statsById });
        vi.stubGlobal("fetch", fetchMock);

        render(<ViewLineupPanel />);
        await waitFor(() => expect(screen.getByText("Bench Two")).toBeInTheDocument());

        // "Bench Two" (bn2, WR) is the second DROP button rendered in bench order.
        fireEvent.click(screen.getAllByRole("button", { name: "DROP" })[1]);

        await waitFor(() => expect(screen.queryByText("Bench Two")).not.toBeInTheDocument());

        const dropCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/remove-player"))!;
        expect(dropCall[1]?.method).toBe("DELETE");
        expect(JSON.parse(String(dropCall[1]?.body))).toEqual({
            rosterId: "test-roster",
            leagueId: "test-league",
            playerId: "bn2",
        });

        expect(screen.getByText("Bench Guy")).toBeInTheDocument();
    });

    it("shows an alert and leaves the lineup unchanged when a remove-player request fails", async () => {
        const roster = makeRoster();
        const fetchMock = createFetchMock({ roster, insights: emptyInsights, statsById, removeOutcome: "failure" });
        vi.stubGlobal("fetch", fetchMock);

        render(<ViewLineupPanel />);
        await waitFor(() => expect(screen.getByText("Justin Jefferson")).toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: "Remove player from WR" }));

        await waitFor(() => expect(alertMock).toHaveBeenCalledWith("Failed to remove player"));

        expect(screen.getByText("Justin Jefferson")).toBeInTheDocument();
        expect(fetchMock.mock.calls.filter(([input]) => String(input).includes("/view-lineup"))).toHaveLength(1);
    });

    it("skips the lineup, insights, and players requests and renders the default empty state when rosterId or leagueId is missing", async () => {
        vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>);
        const fetchMock = createFetchMock({
            roster: makeRoster(),
            insights: populatedInsights,
            statsById,
            playersList: freeAgents,
        });
        vi.stubGlobal("fetch", fetchMock);

        render(<ViewLineupPanel />);

        expect(screen.getByRole("heading", { level: 2, name: "Untitled Lineup" })).toBeInTheDocument();
        expect(screen.getByText("No players on the bench.")).toBeInTheDocument();
        expect(screen.getByText("0.0")).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/view-lineup"))).toBe(false);
        expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/lineup-insights"))).toBe(false);
        // GET /players is now deferred until a slot is actually opened (Phase 4)
        // — nothing here opens one, so it should never fire.
        expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/players"))).toBe(false);
    });

    describe("loading, error, and insights refresh", () => {
        const insightsCalls = (fetchMock: ReturnType<typeof createFetchMock>) =>
            fetchMock.mock.calls.filter(([input]) => String(input).includes("/lineup-insights"));

        it("shows a neutral roster error card on a non-ok /view-lineup and retries into the loaded roster", async () => {
            const fetchMock = createFetchMock({
                roster: makeRoster(),
                insights: emptyInsights,
                statsById,
                lineupOutcome: "failure",
            });
            vi.stubGlobal("fetch", fetchMock);

            render(<ViewLineupPanel />);

            const alert = await screen.findByText("Couldn't load this lineup.");
            expect(alert.closest('[role="alert"]')?.className).not.toMatch(/magenta/);
            expect(screen.queryByText("Josh Allen")).not.toBeInTheDocument();

            vi.stubGlobal("fetch", createFetchMock({ roster: makeRoster(), insights: emptyInsights, statsById }));
            fireEvent.click(screen.getByRole("button", { name: "Retry" }));

            await waitFor(() => expect(screen.getByText("Josh Allen")).toBeInTheDocument());
            expect(screen.queryByText("Couldn't load this lineup.")).not.toBeInTheDocument();
        });

        it("shows the insights error card on a non-ok /lineup-insights, leaves the roster usable, and retries", async () => {
            const fetchMock = createFetchMock({
                roster: makeRoster(),
                insights: populatedInsights,
                statsById,
                insightsOutcome: "failure",
            });
            vi.stubGlobal("fetch", fetchMock);

            render(<ViewLineupPanel />);

            await waitFor(() => expect(screen.getByText("Couldn't load insights.")).toBeInTheDocument());
            expect(screen.getByText("Justin Jefferson")).toBeInTheDocument();
            expect(screen.queryByText("Best Player")).not.toBeInTheDocument();

            vi.stubGlobal("fetch", createFetchMock({ roster: makeRoster(), insights: populatedInsights, statsById }));
            fireEvent.click(screen.getByRole("button", { name: "RETRY" }));

            await waitFor(() => expect(screen.getByText("Best Player")).toBeInTheDocument());
            expect(screen.queryByText("Couldn't load insights.")).not.toBeInTheDocument();
        });

        it("refetches /lineup-insights after removing a starter, without showing the roster skeleton", async () => {
            const fetchMock = createFetchMock({ roster: makeRoster(), insights: populatedInsights, statsById });
            vi.stubGlobal("fetch", fetchMock);

            const { container } = render(<ViewLineupPanel />);
            await waitFor(() => expect(screen.getByText("Best Player")).toBeInTheDocument());
            expect(insightsCalls(fetchMock)).toHaveLength(1);

            fireEvent.click(screen.getByRole("button", { name: "Remove player from WR" }));

            await waitFor(() => expect(insightsCalls(fetchMock)).toHaveLength(2));
            // Roster stays on screen during the refresh; only the insights region is busy.
            expect(screen.getByRole("heading", { level: 2, name: "Championship Squad" })).toBeInTheDocument();
            expect(container.querySelectorAll('[aria-busy="true"]').length).toBeLessThanOrEqual(1);
            await waitFor(() => expect(screen.queryByText("Justin Jefferson")).not.toBeInTheDocument());
            await waitFor(() => expect(screen.getByText("Best Player")).toBeInTheDocument());
        });

        it("refetches /lineup-insights after adding a player", async () => {
            const fetchMock = createFetchMock({
                roster: makeRoster(),
                insights: emptyInsights,
                statsById,
                playersList: freeAgents,
            });
            vi.stubGlobal("fetch", fetchMock);

            render(<ViewLineupPanel />);
            await waitFor(() => expect(screen.getByText("Empty")).toBeInTheDocument());

            fireEvent.click(screen.getByRole("button", { name: "Add player to FLEX" }));
            fireEvent.change(await screen.findByPlaceholderText("Search players..."), {
                target: { value: "Free Agent" },
            });
            fireEvent.click(await screen.findByText("Free Agent Receiver"));

            await waitFor(() => expect(insightsCalls(fetchMock)).toHaveLength(2));
        });

        it("refetches /lineup-insights after a swap", async () => {
            const fetchMock = createFetchMock({ roster: makeRoster(), insights: emptyInsights, statsById });
            vi.stubGlobal("fetch", fetchMock);

            render(<ViewLineupPanel />);
            await waitFor(() => expect(screen.getByText("Bench Guy")).toBeInTheDocument());

            fireEvent.click(screen.getAllByRole("button", { name: "SWAP" })[0]);
            fireEvent.click(screen.getByText("Bijan Robinson"));

            await waitFor(() => expect(insightsCalls(fetchMock)).toHaveLength(2));
        });

        it("hides verdict badges while insights refresh and ignores a stale insights response", async () => {
            const baseFetch = createFetchMock({ roster: makeRoster(), insights: populatedInsights, statsById });
            // Hold every /lineup-insights response so the test controls resolution order.
            const pending: Array<(value: unknown) => void> = [];
            const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
                if (String(input).includes("/lineup-insights")) {
                    return new Promise((resolve) => pending.push(resolve));
                }
                return baseFetch(input, init);
            });
            vi.stubGlobal("fetch", fetchMock);

            render(<ViewLineupPanel />);
            await waitFor(() => expect(pending).toHaveLength(1));
            pending[0](jsonResponse(populatedInsights));
            await waitFor(() => expect(screen.getByText("Best Player")).toBeInTheDocument());

            // Two back-to-back refreshes; answer the newer one first, then the stale one.
            fireEvent.click(screen.getAllByRole("button", { name: "DROP" })[1]);
            await waitFor(() => expect(pending).toHaveLength(2));
            expect(screen.queryByText("Best Player")).not.toBeInTheDocument();
            expect(screen.queryByText("Worst Player")).not.toBeInTheDocument();

            await waitFor(() => expect(screen.getAllByRole("button", { name: "DROP" })).toHaveLength(1));
            fireEvent.click(screen.getAllByRole("button", { name: "DROP" })[0]);
            await waitFor(() => expect(pending).toHaveLength(3));

            pending[2](jsonResponse(emptyInsights));
            await waitFor(() => expect(screen.getByText("No players rostered yet.")).toBeInTheDocument());

            pending[1](jsonResponse(populatedInsights));
            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(screen.getByText("No players rostered yet.")).toBeInTheDocument();
            expect(screen.queryByText("Best Player")).not.toBeInTheDocument();
        });
    });
});
