import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LineupSlot from "./index";
import type { LineupSlot as LineupSlotType, PlayerStats } from "../LineupSlotsList";

const buildStats = (overrides: Partial<PlayerStats> = {}): PlayerStats => ({
    fullName: "Justin Jefferson",
    gamesPlayed: 16,
    position: "WR",
    season: 2025,
    team: "MIN",
    totalPoints: 289.4,
    positionRank: 2,
    positionPlayerCount: 60,
    ...overrides,
});

const buildSlot = (overrides: Partial<LineupSlotType> = {}): LineupSlotType => ({
    id: "slot-1",
    label: "WR",
    ...overrides,
});

describe("LineupSlot", () => {
    it("renders an empty slot with the slot label and 'Empty' placeholder", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: null })} />);

        expect(screen.getByText("WR")).toBeInTheDocument();
        expect(screen.getByText("Empty")).toBeInTheDocument();
    });

    it("shows the add circle for an empty slot when onClick is provided, and calls it with the slot", () => {
        const onClick = vi.fn();
        const slot = buildSlot({ assignedPlayerName: null });
        render(<LineupSlot slot={slot} onClick={onClick} />);

        const addButton = screen.getByRole("button", { name: "Add player to WR" });
        addButton.click();

        expect(onClick).toHaveBeenCalledWith(slot);
    });

    it("does not show the add circle when the slot already has a player, even if onClick is provided", () => {
        render(
            <LineupSlot
                slot={buildSlot({ assignedPlayerName: "CeeDee Lamb" })}
                onClick={vi.fn()}
            />
        );

        expect(screen.queryByRole("button", { name: /Add player to/ })).not.toBeInTheDocument();
    });

    it("does not show the add circle when onClick is not provided", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: null })} />);

        expect(screen.queryByRole("button", { name: /Add player to/ })).not.toBeInTheDocument();
    });

    it("renders the assigned player's name and meta text", () => {
        render(
            <LineupSlot
                slot={buildSlot({ assignedPlayerName: "CeeDee Lamb", meta: "DAL · WR1" })}
            />
        );

        expect(screen.getByText("CeeDee Lamb")).toBeInTheDocument();
        expect(screen.getByText("DAL · WR1")).toBeInTheDocument();
    });

    it("does not render meta text for an empty slot even if meta is set", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: null, meta: "DAL · WR1" })} />);

        expect(screen.queryByText("DAL · WR1")).not.toBeInTheDocument();
    });

    it("calls onViewPlayer with the slot when the player info button is clicked", () => {
        const onViewPlayer = vi.fn();
        const slot = buildSlot({ assignedPlayerName: "CeeDee Lamb" });
        render(<LineupSlot slot={slot} onViewPlayer={onViewPlayer} />);

        screen.getByRole("button", { name: /CeeDee Lamb/ }).click();

        expect(onViewPlayer).toHaveBeenCalledWith(slot);
    });

    it("disables the player info button when the slot is empty", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: null })} onViewPlayer={vi.fn()} />);

        expect(screen.getByRole("button", { name: "WREmpty" })).toBeDisabled();
    });

    it("disables the player info button when no onViewPlayer handler is provided", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: "CeeDee Lamb" })} />);

        expect(screen.getByRole("button", { name: /CeeDee Lamb/ })).toBeDisabled();
    });

    it("renders the projected points value from assignedPlayerStats", () => {
        render(
            <LineupSlot
                slot={buildSlot({ assignedPlayerName: "Justin Jefferson", assignedPlayerStats: buildStats() })}
            />
        );

        expect(screen.getByText("289.4")).toBeInTheDocument();
    });

    it("renders an em dash for projected points when no stats are assigned", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: "Justin Jefferson" })} />);

        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("renders a cyan Best Player badge when isBestPlayer is true", () => {
        const { container } = render(
            <LineupSlot slot={buildSlot({ assignedPlayerName: "Justin Jefferson", isBestPlayer: true })} />
        );

        const badge = screen.getByText("Best Player");
        expect(badge).toBeInTheDocument();
        expect(badge.className).toMatch(/cyan/);
        expect(container.querySelector('[class*="magenta"]')).not.toBeInTheDocument();
    });

    it("renders a cyan Dark Horse badge when isDarkHorse is true", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: "Justin Jefferson", isDarkHorse: true })} />);

        const badge = screen.getByText("Dark Horse");
        expect(badge).toBeInTheDocument();
        expect(badge.className).toMatch(/cyan/);
    });

    it("renders a magenta Worst Player badge and worst-rail styling when isWorstPlayer is true", () => {
        const { container } = render(
            <LineupSlot slot={buildSlot({ assignedPlayerName: "Bench Warmer", isWorstPlayer: true })} />
        );

        const badge = screen.getByText("Worst Player");
        expect(badge.className).toMatch(/magenta/);
        expect(container.querySelector('[class*="worstRail"]')).toBeInTheDocument();
    });

    it("does not render any verdict badges for a plain assigned player", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: "Regular Guy" })} />);

        expect(screen.queryByText("Best Player")).not.toBeInTheDocument();
        expect(screen.queryByText("Dark Horse")).not.toBeInTheDocument();
        expect(screen.queryByText("Worst Player")).not.toBeInTheDocument();
    });

    it("renders a remove button with an accessible label when onRemove is provided and the slot is filled", () => {
        render(
            <LineupSlot slot={buildSlot({ assignedPlayerName: "CeeDee Lamb" })} onRemove={vi.fn()} />
        );

        expect(screen.getByRole("button", { name: "Remove player from WR" })).toBeInTheDocument();
    });

    it("calls onRemove with the slot when the remove button is clicked", () => {
        const onRemove = vi.fn();
        const slot = buildSlot({ assignedPlayerName: "CeeDee Lamb" });
        render(<LineupSlot slot={slot} onRemove={onRemove} />);

        screen.getByRole("button", { name: "Remove player from WR" }).click();

        expect(onRemove).toHaveBeenCalledWith(slot);
    });

    it("does not render a remove button for an empty slot", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: null })} onRemove={vi.fn()} />);

        expect(screen.queryByRole("button", { name: /Remove player/ })).not.toBeInTheDocument();
    });

    it("does not render a remove button when onRemove is not provided", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: "CeeDee Lamb" })} />);

        expect(screen.queryByRole("button", { name: /Remove player/ })).not.toBeInTheDocument();
    });

    it("renders as a swap-target button and calls onSwapTarget with the slot when clicked", () => {
        const onSwapTarget = vi.fn();
        const slot = buildSlot({
            assignedPlayerName: "Swap Candidate",
            swapTarget: true,
            assignedPlayerStats: buildStats({ totalPoints: 12.3 }),
        });
        render(<LineupSlot slot={slot} onSwapTarget={onSwapTarget} />);

        const swapButton = screen.getByRole("button", { name: /Swap Candidate/ });
        swapButton.click();

        expect(onSwapTarget).toHaveBeenCalledWith(slot);
        expect(screen.getByText("12.3")).toBeInTheDocument();
    });

    it("falls back to the normal row when swapTarget is true but no onSwapTarget handler is given", () => {
        render(<LineupSlot slot={buildSlot({ assignedPlayerName: "Swap Candidate", swapTarget: true })} />);

        expect(screen.getByText("Swap Candidate")).toBeInTheDocument();
        // Only the disabled player-info button renders — no whole-row swap button.
        expect(screen.getAllByRole("button")).toHaveLength(1);
        expect(screen.getByRole("button")).toBeDisabled();
    });
});
