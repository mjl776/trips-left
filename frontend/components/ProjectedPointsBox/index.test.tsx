import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProjectPointsBox from "./index";
import type { PlayerStats } from "../LineupSlotsList";

const baseStats: PlayerStats = {
    fullName: "Test Player",
    gamesPlayed: 16,
    position: "WR",
    season: 2025,
    team: "AAA",
    totalPoints: 123.456,
    positionRank: 3,
    positionPlayerCount: 40,
};

describe("ProjectPointsBox", () => {
    it("renders an em-dash when no stats are provided", () => {
        render(<ProjectPointsBox />);

        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("renders the total points rounded to one decimal when stats are provided", () => {
        render(<ProjectPointsBox stats={baseStats} />);

        expect(screen.getByText("123.5")).toBeInTheDocument();
    });

    it("renders 0.0 for K/DEF players, who always score zero", () => {
        render(<ProjectPointsBox stats={{ ...baseStats, position: "K", totalPoints: 0 }} />);

        expect(screen.getByText("0.0")).toBeInTheDocument();
    });
});
