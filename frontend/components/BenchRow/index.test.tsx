import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import BenchRow from "./index";
import type { AddPlayerOverlayPlayer } from "../AddPlayerOverlay";
import type { PlayerStats } from "../LineupSlotsList";

afterEach(() => {
    cleanup();
});

const player: AddPlayerOverlayPlayer = {
    playerId: "p1",
    fullName: "Bench Guy",
    position: "RB",
    team: "AAA",
};

const stats: PlayerStats = {
    fullName: "Bench Guy",
    gamesPlayed: 16,
    position: "RB",
    season: 2025,
    team: "AAA",
    totalPoints: 87.4,
    positionRank: 12,
    positionPlayerCount: 60,
};

describe("BenchRow", () => {
    it("renders the player's position, name, team, and points", () => {
        render(
            <BenchRow player={player} stats={stats} onView={() => {}} onSwap={() => {}} onDrop={() => {}} />,
        );

        expect(screen.getByText("RB")).toBeInTheDocument();
        expect(screen.getByText("Bench Guy")).toBeInTheDocument();
        expect(screen.getByText("AAA")).toBeInTheDocument();
        expect(screen.getByText("87.4")).toBeInTheDocument();
    });

    it("renders FA when the player has no team", () => {
        render(
            <BenchRow
                player={{ ...player, team: null }}
                onView={() => {}}
                onSwap={() => {}}
                onDrop={() => {}}
            />,
        );

        expect(screen.getByText("FA")).toBeInTheDocument();
    });

    it("renders an em-dash when no stats are supplied", () => {
        render(<BenchRow player={player} onView={() => {}} onSwap={() => {}} onDrop={() => {}} />);

        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("fires onView when the player info button is clicked", () => {
        const onView = vi.fn();
        render(<BenchRow player={player} onView={onView} onSwap={() => {}} onDrop={() => {}} />);

        screen.getByText("Bench Guy").closest("button")!.click();
        expect(onView).toHaveBeenCalledTimes(1);
    });

    it("fires onSwap when SWAP is clicked", () => {
        const onSwap = vi.fn();
        render(<BenchRow player={player} onView={() => {}} onSwap={onSwap} onDrop={() => {}} />);

        screen.getByRole("button", { name: "SWAP" }).click();
        expect(onSwap).toHaveBeenCalledTimes(1);
    });

    it("fires onDrop when DROP is clicked", () => {
        const onDrop = vi.fn();
        render(<BenchRow player={player} onView={() => {}} onSwap={() => {}} onDrop={onDrop} />);

        screen.getByRole("button", { name: "DROP" }).click();
        expect(onDrop).toHaveBeenCalledTimes(1);
    });

    it("disables all buttons when disabled is true", () => {
        render(
            <BenchRow player={player} onView={() => {}} onSwap={() => {}} onDrop={() => {}} disabled />,
        );

        expect(screen.getByText("Bench Guy").closest("button")).toBeDisabled();
        expect(screen.getByRole("button", { name: "SWAP" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "DROP" })).toBeDisabled();
    });

    describe("empty slot", () => {
        it("renders the empty placeholder copy instead of a player", () => {
            render(<BenchRow player={null} />);

            expect(screen.getByText("Empty bench slot")).toBeInTheDocument();
            expect(screen.getByText("Add a player to fill this spot")).toBeInTheDocument();
            expect(screen.getByText("BN")).toBeInTheDocument();
        });

        it("does not render an add button when onAdd is not supplied", () => {
            render(<BenchRow player={null} />);

            expect(screen.queryByRole("button", { name: "Add player to bench" })).not.toBeInTheDocument();
        });

        it("fires onAdd when the add button is clicked", () => {
            const onAdd = vi.fn();
            render(<BenchRow player={null} onAdd={onAdd} />);

            screen.getByRole("button", { name: "Add player to bench" }).click();
            expect(onAdd).toHaveBeenCalledTimes(1);
        });

        it("disables the add button when disabled is true", () => {
            render(<BenchRow player={null} onAdd={() => {}} disabled />);

            expect(screen.getByRole("button", { name: "Add player to bench" })).toBeDisabled();
        });
    });
});
