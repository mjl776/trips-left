import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateLeagueStep from "./index";
import type { League } from "@/types/LeagueTypes";

const mockLeague: League = {
    leagueId: "mock-league-1",
    name: "Mock League",
    season: 2026,
    rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF"],
    numTeams: 1,
    isMock: true,
};

const importedLeague: League = {
    leagueId: "1234567890",
    name: "Sleeper Dynasty",
    season: 2026,
    rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"],
    numTeams: 12,
    isMock: false,
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("CreateLeagueStep", () => {
    it("renders the mock league card with the fixed starter slots and the import card with its default hint", () => {
        render(<CreateLeagueStep onLeagueAttached={vi.fn()} />);

        expect(screen.getByText("Mock league")).toBeInTheDocument();
        expect(screen.getByText("Import from Sleeper")).toBeInTheDocument();

        expect(screen.getByText("QB")).toBeInTheDocument();
        expect(screen.getAllByText("RB")).toHaveLength(2);
        expect(screen.getAllByText("WR")).toHaveLength(2);
        expect(screen.getByText("TE")).toBeInTheDocument();
        expect(screen.getAllByText("FLEX")).toHaveLength(2);
        expect(screen.getByText("K")).toBeInTheDocument();
        expect(screen.getByText("DEF")).toBeInTheDocument();
        expect(screen.getByText("10× BN")).toBeInTheDocument();

        expect(screen.getByText("Find the ID in your Sleeper league URL.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Create mock league" })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Import" })).toBeEnabled();
    });

    it("shows a pending state while creating a mock league, then hands the league to onLeagueAttached", async () => {
        let resolveFetch!: (value: unknown) => void;
        const fetchPromise = new Promise((resolve) => {
            resolveFetch = resolve;
        });
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));
        const onLeagueAttached = vi.fn();

        render(<CreateLeagueStep onLeagueAttached={onLeagueAttached} />);
        fireEvent.click(screen.getByRole("button", { name: "Create mock league" }));

        expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();

        resolveFetch({ ok: true, json: async () => mockLeague });
        await waitFor(() => expect(onLeagueAttached).toHaveBeenCalledWith(mockLeague));

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/create-mock-league"), { method: "POST" });
        expect(screen.getByRole("button", { name: "Create mock league" })).toBeEnabled();
    });

    it("alerts and resets when creating a mock league fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const onLeagueAttached = vi.fn();

        render(<CreateLeagueStep onLeagueAttached={onLeagueAttached} />);
        fireEvent.click(screen.getByRole("button", { name: "Create mock league" }));

        await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Failed to create mock league"));
        expect(onLeagueAttached).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Create mock league" })).toBeEnabled();
    });

    it("rejects a non-numeric or too-short Sleeper ID client-side without calling fetch", () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        render(<CreateLeagueStep onLeagueAttached={vi.fn()} />);
        fireEvent.change(screen.getByPlaceholderText("Sleeper league ID"), { target: { value: "abc12" } });
        fireEvent.click(screen.getByRole("button", { name: "Import" }));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(
            screen.getByText("That doesn't look like a Sleeper league ID — it's a long numeric string."),
        ).toBeInTheDocument();
    });

    it("resets the hint back to the default once the user edits the input again", () => {
        vi.stubGlobal("fetch", vi.fn());

        render(<CreateLeagueStep onLeagueAttached={vi.fn()} />);
        fireEvent.change(screen.getByPlaceholderText("Sleeper league ID"), { target: { value: "abc" } });
        fireEvent.click(screen.getByRole("button", { name: "Import" }));
        expect(screen.getByText(/doesn't look like a Sleeper league ID/)).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("Sleeper league ID"), { target: { value: "abc1" } });
        expect(screen.getByText("Find the ID in your Sleeper league URL.")).toBeInTheDocument();
    });

    it("imports a league by ID and hands it to onLeagueAttached", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => importedLeague });
        vi.stubGlobal("fetch", fetchMock);
        const onLeagueAttached = vi.fn();

        render(<CreateLeagueStep onLeagueAttached={onLeagueAttached} />);
        fireEvent.change(screen.getByPlaceholderText("Sleeper league ID"), { target: { value: "1234567890" } });
        fireEvent.click(screen.getByRole("button", { name: "Import" }));

        await waitFor(() => expect(onLeagueAttached).toHaveBeenCalledWith(importedLeague));
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/import-sleeper-league/1234567890"), {
            method: "POST",
        });
    });

    it("surfaces the server's error message when the import request 400s", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "League not found" }) }),
        );

        render(<CreateLeagueStep onLeagueAttached={vi.fn()} />);
        fireEvent.change(screen.getByPlaceholderText("Sleeper league ID"), { target: { value: "1234567890" } });
        fireEvent.click(screen.getByRole("button", { name: "Import" }));

        await waitFor(() => expect(screen.getByText("League not found")).toBeInTheDocument());
    });

    it("falls back to a generic message when the import request 400s without one", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

        render(<CreateLeagueStep onLeagueAttached={vi.fn()} />);
        fireEvent.change(screen.getByPlaceholderText("Sleeper league ID"), { target: { value: "1234567890" } });
        fireEvent.click(screen.getByRole("button", { name: "Import" }));

        await waitFor(() => expect(screen.getByText("That league couldn't be found.")).toBeInTheDocument());
    });

    it("shows a network-error hint when the import request throws", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        render(<CreateLeagueStep onLeagueAttached={vi.fn()} />);
        fireEvent.change(screen.getByPlaceholderText("Sleeper league ID"), { target: { value: "1234567890" } });
        fireEvent.click(screen.getByRole("button", { name: "Import" }));

        await waitFor(() =>
            expect(screen.getByText("Something went wrong reaching Sleeper.")).toBeInTheDocument(),
        );
    });
});
