import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateLineupSlotsPanel from "./index";
import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";
import type { PlayerStats } from "@/components/LineupSlotsList";
import type { League } from "@/types/LeagueTypes";
import { getSavedLineups } from "@/lib/savedLineups";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

const mockLeague: League = {
    leagueId: "league-abcdefghijklmnopqrstuvwxyz",
    name: "Test League",
    season: 2026,
    rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF"],
    numTeams: 1,
    isMock: true,
};

const importedLeague: League = {
    leagueId: "sleeper-league-id",
    name: null,
    season: 2026,
    rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"],
    numTeams: null,
    isMock: false,
};

// One eligible player per starter slot (QB, RB x2 + 1 extra for FLEX, WR x2 + 1 extra
// for FLEX, TE, K, DEF), all sharing the word "Player" so a single overlay search can
// exercise eligibility filtering.
const allPlayers: AddPlayerOverlayPlayer[] = [
    { playerId: "qb-1", fullName: "Quarterback Player", position: "QB", team: "BUF" },
    { playerId: "rb-1", fullName: "Runningback Player One", position: "RB", team: "SF" },
    { playerId: "rb-2", fullName: "Runningback Player Two", position: "RB", team: "TEN" },
    { playerId: "rb-3", fullName: "Runningback Player Three", position: "RB", team: "DAL" },
    { playerId: "wr-1", fullName: "Widereceiver Player One", position: "WR", team: "MIN" },
    { playerId: "wr-2", fullName: "Widereceiver Player Two", position: "WR", team: "CIN" },
    { playerId: "wr-3", fullName: "Widereceiver Player Three", position: "WR", team: "MIA" },
    { playerId: "te-1", fullName: "Tightend Player", position: "TE", team: "KC" },
    { playerId: "k-1", fullName: "Kicker Player", position: "K", team: "BAL" },
    { playerId: "def-1", fullName: "Defense Player", position: "DEF", team: null },
];

const statsByPlayerId: Record<string, PlayerStats> = Object.fromEntries(
    allPlayers.map((player, index) => [
        player.playerId,
        {
            fullName: player.fullName,
            gamesPlayed: 16,
            position: player.position,
            season: 2025,
            team: player.team,
            totalPoints: 100 + index,
            positionRank: index + 1,
            positionPlayerCount: 40,
        } satisfies PlayerStats,
    ]),
);

type FetchOverrides = {
    playersOk?: boolean;
    createLineupOk?: boolean;
};

function stubFetch({ playersOk = true, createLineupOk = true }: FetchOverrides = {}) {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
        if (url.includes("/create-lineup")) {
            if (!createLineupOk) return Promise.resolve({ ok: false, json: async () => ({ message: "Slot QB is already filled" }) });
            const body = init?.body ? JSON.parse(String(init.body)) : {};
            return Promise.resolve({
                ok: true,
                json: async () => ({ rosterId: "roster-1", leagueId: body.leagueId, name: body.name }),
            });
        }
        if (url.includes("/view-player")) {
            const params = new URLSearchParams(url.split("?")[1]);
            const playerId = params.get("playerId") ?? "";
            const stats = statsByPlayerId[playerId];
            return Promise.resolve({ ok: !!stats, json: async () => stats });
        }
        if (url.includes("/players")) {
            if (!playersOk) return Promise.reject(new Error("network down"));
            return Promise.resolve({ ok: true, json: async () => allPlayers });
        }
        return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

// Lets pending fetch microtasks (e.g. the /players load-on-mount effect) settle
// so a subsequent state update isn't reported as happening outside of act().
async function flushPendingFetches() {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
}

async function selectPlayerForSlot(slotLabel: string, playerFullName: string) {
    const addButtons = await screen.findAllByRole("button", { name: `Add player to ${slotLabel}` });
    fireEvent.click(addButtons[0]);
    fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: playerFullName } });
    const resultButton = await screen.findByRole("button", { name: new RegExp(playerFullName) });
    fireEvent.click(resultButton);
}

// Fills every starter slot with a distinct eligible player: QB, RB, RB, WR, WR, TE, FLEX, FLEX, K, DEF.
async function fillAllStarterSlots() {
    await selectPlayerForSlot("QB", "Quarterback Player");
    await selectPlayerForSlot("RB", "Runningback Player One");
    await selectPlayerForSlot("RB", "Runningback Player Two");
    await selectPlayerForSlot("WR", "Widereceiver Player One");
    await selectPlayerForSlot("WR", "Widereceiver Player Two");
    await selectPlayerForSlot("TE", "Tightend Player");
    await selectPlayerForSlot("FLEX", "Runningback Player Three");
    await selectPlayerForSlot("FLEX", "Widereceiver Player Three");
    await selectPlayerForSlot("K", "Kicker Player");
    await selectPlayerForSlot("DEF", "Defense Player");
}

beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.clear();
});

describe("CreateLineupSlotsPanel", () => {
    it("renders league details and ten empty starter slots with a disabled create button", async () => {
        stubFetch();
        render(<CreateLineupSlotsPanel league={mockLeague} onChangeLeague={vi.fn()} />);

        expect(screen.getByText("LEAGUE ATTACHED")).toBeInTheDocument();
        expect(screen.getByText("Test League")).toBeInTheDocument();
        expect(screen.getByText("Mock")).toBeInTheDocument();
        expect(screen.getByText("league-abcdefg")).toBeInTheDocument(); // leagueId sliced to 14 chars
        expect(screen.getByText("2026")).toBeInTheDocument();
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("Sleeper default")).toBeInTheDocument();
        expect(screen.getByText("10 + 10 BN")).toBeInTheDocument();
        expect(
            screen.getByText("Mock league scoring is fixed at creation — it can't be edited afterwards."),
        ).toBeInTheDocument();

        expect(screen.getAllByText("Empty")).toHaveLength(10);
        expect(screen.getByText("QB")).toBeInTheDocument();
        expect(screen.getAllByText("RB")).toHaveLength(2);
        expect(screen.getAllByText("WR")).toHaveLength(2);
        expect(screen.getByText("TE")).toBeInTheDocument();
        expect(screen.getAllByText("FLEX")).toHaveLength(2);
        expect(screen.getByText("K")).toBeInTheDocument();
        expect(screen.getByText("DEF")).toBeInTheDocument();

        const createButton = screen.getByRole("button", { name: "0 of 10 slots filled" });
        expect(createButton).toBeDisabled();

        await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/players")));
    });

    it("falls back to placeholder copy for an imported league with no name or team count", async () => {
        stubFetch();
        render(<CreateLineupSlotsPanel league={importedLeague} onChangeLeague={vi.fn()} />);

        expect(screen.getByText("Untitled league")).toBeInTheDocument();
        expect(screen.getByText("Sleeper import")).toBeInTheDocument();
        expect(screen.getByText("From league")).toBeInTheDocument();
        expect(screen.getByText("—")).toBeInTheDocument(); // TEAMS fallback
        expect(
            screen.getByText("Imported settings stay in sync with Sleeper and are read-only here."),
        ).toBeInTheDocument();

        await flushPendingFetches();
    });

    it("only offers position-eligible players in the add-player overlay, and assigns the selection", async () => {
        stubFetch();
        render(<CreateLineupSlotsPanel league={mockLeague} onChangeLeague={vi.fn()} />);

        const addButtons = await screen.findAllByRole("button", { name: "Add player to QB" });
        fireEvent.click(addButtons[0]);
        expect(screen.getByText("Add QB")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "Player" } });
        // Only the QB should surface even though every fixture player's name contains "Player".
        expect(screen.getByRole("button", { name: /Quarterback Player/ })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Runningback Player/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Widereceiver Player/ })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Quarterback Player/ }));

        // Overlay closes and the slot now shows the assigned player.
        expect(screen.queryByText("Add QB")).not.toBeInTheDocument();
        expect(screen.getByText("Quarterback Player")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Remove player from QB" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "1 of 10 slots filled" })).toBeDisabled();

        // The projected-points fetch for the newly assigned player resolves asynchronously.
        await waitFor(() => expect(screen.getByText("100.0")).toBeInTheDocument());
    });

    it("clears a slot when its remove button is clicked", async () => {
        stubFetch();
        render(<CreateLineupSlotsPanel league={mockLeague} onChangeLeague={vi.fn()} />);

        await selectPlayerForSlot("QB", "Quarterback Player");
        expect(screen.getByText("Quarterback Player")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Remove player from QB" }));

        expect(screen.queryByText("Quarterback Player")).not.toBeInTheDocument();
        expect(screen.getAllByText("Empty")).toHaveLength(10);
        expect(screen.getByRole("button", { name: "0 of 10 slots filled" })).toBeDisabled();

        await flushPendingFetches();
    });

    it("enables Create lineup once all ten starter slots are filled, and submits the assignments", async () => {
        const fetchMock = stubFetch();
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        render(<CreateLineupSlotsPanel league={mockLeague} onChangeLeague={vi.fn()} />);

        await fillAllStarterSlots();

        fireEvent.change(screen.getByPlaceholderText("Name your lineup"), { target: { value: "My Lineup" } });

        const createButton = screen.getByRole("button", { name: "Create lineup" });
        expect(createButton).toBeEnabled();
        fireEvent.click(createButton);

        await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Lineup created!"));
        expect(pushMock).toHaveBeenCalledWith("/lineup-management");

        const createLineupCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/create-lineup"));
        expect(createLineupCall).toBeDefined();
        const [, init] = createLineupCall!;
        const body = JSON.parse(String((init as RequestInit).body));
        expect(body.leagueId).toBe(mockLeague.leagueId);
        expect(body.name).toBe("My Lineup");
        expect(body.assignments).toEqual([
            { playerId: "qb-1", slot: "QB" },
            { playerId: "rb-1", slot: "RB" },
            { playerId: "rb-2", slot: "RB" },
            { playerId: "wr-1", slot: "WR" },
            { playerId: "wr-2", slot: "WR" },
            { playerId: "te-1", slot: "TE" },
            { playerId: "rb-3", slot: "FLEX" },
            { playerId: "wr-3", slot: "FLEX" },
            { playerId: "k-1", slot: "K" },
            { playerId: "def-1", slot: "DEF" },
        ]);

        const saved = getSavedLineups();
        expect(saved).toHaveLength(1);
        expect(saved[0]).toMatchObject({ rosterId: "roster-1", leagueId: mockLeague.leagueId, isMock: true });
    });

    it("alerts a generic failure message when the create-lineup request 400s", async () => {
        stubFetch({ createLineupOk: false });
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        render(<CreateLineupSlotsPanel league={mockLeague} onChangeLeague={vi.fn()} />);

        await fillAllStarterSlots();
        fireEvent.click(screen.getByRole("button", { name: "Create lineup" }));

        await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Failed to create lineup"));
        expect(pushMock).not.toHaveBeenCalled();
        expect(getSavedLineups()).toHaveLength(0);
        // Button resets back to enabled ("Create lineup") since submission finished (unsuccessfully).
        expect(screen.getByRole("button", { name: "Create lineup" })).toBeEnabled();
    });

    it("calls onChangeLeague when Change league is clicked", async () => {
        stubFetch();
        const onChangeLeague = vi.fn();
        render(<CreateLineupSlotsPanel league={mockLeague} onChangeLeague={onChangeLeague} />);

        fireEvent.click(screen.getByRole("button", { name: "Change league" }));
        expect(onChangeLeague).toHaveBeenCalledTimes(1);

        await flushPendingFetches();
    });

    it("leaves the player pool empty (without crashing) when GET /players fails", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        stubFetch({ playersOk: false });
        render(<CreateLineupSlotsPanel league={mockLeague} onChangeLeague={vi.fn()} />);

        const addButtons = await screen.findAllByRole("button", { name: "Add player to QB" });
        fireEvent.click(addButtons[0]);
        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "Player" } });

        expect(await screen.findByText("No players found")).toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
