import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LineupSlotsList, { type LineupSlot, type LineupSlotSection } from "./index";

const emptySlot: LineupSlot = {
    id: "starter-0",
    label: "QB",
};

const filledSlot: LineupSlot = {
    id: "starter-1",
    label: "RB",
    assignedPlayerId: "p1",
    assignedPlayerName: "Star Runner",
    meta: "AAA",
    isBestPlayer: true,
};

const worstSlot: LineupSlot = {
    id: "starter-2",
    label: "WR",
    assignedPlayerName: "Bad Wideout",
    isWorstPlayer: true,
};

const darkHorseSlot: LineupSlot = {
    id: "starter-3",
    label: "TE",
    assignedPlayerName: "Sleeper Pick",
    isDarkHorse: true,
};

const swapTargetSlot: LineupSlot = {
    id: "bench-0",
    label: "BN",
    assignedPlayerName: "Bench Guy",
    swapTarget: true,
};

describe("LineupSlotsList", () => {
    it("renders a section divider per section title", () => {
        const sections: LineupSlotSection[] = [
            { title: "Starters", slots: [emptySlot] },
            { title: "Bench", slots: [swapTargetSlot] },
        ];
        render(<LineupSlotsList sections={sections} />);

        expect(screen.getByText("Starters")).toBeInTheDocument();
        expect(screen.getByText("Bench")).toBeInTheDocument();
    });

    it("renders an empty slot with an Add button that fires onSlotClick", () => {
        const onSlotClick = vi.fn();
        const sections: LineupSlotSection[] = [{ title: "Starters", slots: [emptySlot] }];
        render(<LineupSlotsList sections={sections} onSlotClick={onSlotClick} />);

        expect(screen.getByText("Empty")).toBeInTheDocument();
        const addButton = screen.getByRole("button", { name: "Add player to QB" });
        addButton.click();
        expect(onSlotClick).toHaveBeenCalledWith(emptySlot);
    });

    it("renders a filled slot with best-player badge, points, and remove/view callbacks", () => {
        const onViewPlayer = vi.fn();
        const onRemovePlayer = vi.fn();
        const sections: LineupSlotSection[] = [{ title: "Starters", slots: [filledSlot] }];
        render(
            <LineupSlotsList sections={sections} onViewPlayer={onViewPlayer} onRemovePlayer={onRemovePlayer} />,
        );

        expect(screen.getByText("Star Runner")).toBeInTheDocument();
        expect(screen.getByText("AAA")).toBeInTheDocument();
        expect(screen.getByText("Best Player")).toBeInTheDocument();

        screen.getByText("Star Runner").closest("button")!.click();
        expect(onViewPlayer).toHaveBeenCalledWith(filledSlot);

        screen.getByRole("button", { name: "Remove player from RB" }).click();
        expect(onRemovePlayer).toHaveBeenCalledWith(filledSlot);
    });

    it("renders the worst-player badge for a worst-player slot", () => {
        const sections: LineupSlotSection[] = [{ title: "Starters", slots: [worstSlot] }];
        render(<LineupSlotsList sections={sections} />);

        expect(screen.getByText("Worst Player")).toBeInTheDocument();
    });

    it("renders the dark-horse badge for a dark-horse slot", () => {
        const sections: LineupSlotSection[] = [{ title: "Starters", slots: [darkHorseSlot] }];
        render(<LineupSlotsList sections={sections} />);

        expect(screen.getByText("Dark Horse")).toBeInTheDocument();
    });

    it("renders swap-target slots as buttons that fire onSwapTarget", () => {
        const onSwapTarget = vi.fn();
        const sections: LineupSlotSection[] = [{ title: "Bench", slots: [swapTargetSlot] }];
        render(<LineupSlotsList sections={sections} onSwapTarget={onSwapTarget} />);

        const swapButton = screen.getByText("Bench Guy").closest("button")!;
        swapButton.click();
        expect(onSwapTarget).toHaveBeenCalledWith(swapTargetSlot);
    });
});
