import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { League } from "@/types/LeagueTypes";

const mockLeague: League = {
    leagueId: "league-abc123",
    name: "Mock League",
    season: 2026,
    rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF"],
    numTeams: 1,
    isMock: true,
};

vi.mock("@/components/CreateLeagueStep", () => ({
    default: ({ onLeagueAttached }: { onLeagueAttached: (league: League) => void }) => (
        <button type="button" onClick={() => onLeagueAttached(mockLeague)}>
            mock-create-league-step
        </button>
    ),
}));

vi.mock("@/components/CreateLineupSlotsPanel", () => ({
    default: ({ league, onChangeLeague }: { league: League; onChangeLeague: () => void }) => (
        <div>
            <span>mock-slots-panel:{league.leagueId}</span>
            <button type="button" onClick={onChangeLeague}>
                change league
            </button>
        </div>
    ),
}));

import CreateLineupFlow from "./index";

describe("CreateLineupFlow", () => {
    it("starts on the league-attach step", () => {
        render(<CreateLineupFlow />);

        expect(screen.getByText("STEP 1 OF 2")).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 2, name: "Attach a league" })).toBeInTheDocument();
        expect(screen.getByText(/A lineup can't exist without scoring settings/)).toBeInTheDocument();
        expect(screen.getByText("mock-create-league-step")).toBeInTheDocument();
    });

    it("advances to the roster step once a league is attached", () => {
        render(<CreateLineupFlow />);

        fireEvent.click(screen.getByText("mock-create-league-step"));

        expect(screen.getByText("STEP 2 OF 2")).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 2, name: "Build the lineup" })).toBeInTheDocument();
        expect(screen.getByText(/Fill every starter slot/)).toBeInTheDocument();
        expect(screen.getByText("mock-slots-panel:league-abc123")).toBeInTheDocument();
    });

    it("returns to the league step when the league is changed", () => {
        render(<CreateLineupFlow />);

        fireEvent.click(screen.getByText("mock-create-league-step"));
        fireEvent.click(screen.getByText("change league"));

        expect(screen.getByText("STEP 1 OF 2")).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 2, name: "Attach a league" })).toBeInTheDocument();
    });
});
