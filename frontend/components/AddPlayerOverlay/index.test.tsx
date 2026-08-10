import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddPlayerOverlay, { type AddPlayerOverlayPlayer } from "./index";

const buildPlayer = (overrides: Partial<AddPlayerOverlayPlayer> = {}): AddPlayerOverlayPlayer => ({
    playerId: "p-1",
    fullName: "Justin Jefferson",
    position: "WR",
    team: "MIN",
    ...overrides,
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("AddPlayerOverlay", () => {
    it("shows the 'ADD PLAYER' tag and slot label title when there is no occupant", () => {
        render(
            <AddPlayerOverlay slotLabel="WR" players={[buildPlayer()]} onSelect={vi.fn()} onClose={vi.fn()} />
        );

        expect(screen.getByText("ADD PLAYER")).toBeInTheDocument();
        expect(screen.getByText("Add WR")).toBeInTheDocument();
    });

    it("shows the 'ADD & DROP' tag and replace title when an occupant is provided", () => {
        render(
            <AddPlayerOverlay
                slotLabel="WR"
                players={[buildPlayer()]}
                onSelect={vi.fn()}
                onClose={vi.fn()}
                occupantName="CeeDee Lamb"
            />
        );

        expect(screen.getByText("ADD & DROP")).toBeInTheDocument();
        expect(screen.getByText("Replace CeeDee Lamb")).toBeInTheDocument();
    });

    it("prompts to search before any query is entered", () => {
        render(
            <AddPlayerOverlay slotLabel="WR" players={[buildPlayer()]} onSelect={vi.fn()} onClose={vi.fn()} />
        );

        expect(screen.getByText("Search players")).toBeInTheDocument();
    });

    it("filters players case-insensitively by full name as the user types", async () => {
        const players = [
            buildPlayer({ playerId: "p-1", fullName: "Justin Jefferson" }),
            buildPlayer({ playerId: "p-2", fullName: "Justin Fields", position: "QB", team: "PIT" }),
            buildPlayer({ playerId: "p-3", fullName: "CeeDee Lamb", position: "WR", team: "DAL" }),
        ];
        render(<AddPlayerOverlay slotLabel="WR" players={players} onSelect={vi.fn()} onClose={vi.fn()} />);

        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "justin" } });

        await waitFor(() => {
            expect(screen.getByText("Justin Jefferson")).toBeInTheDocument();
        });
        expect(screen.getByText("Justin Fields")).toBeInTheDocument();
        expect(screen.queryByText("CeeDee Lamb")).not.toBeInTheDocument();
    });

    it("renders a player's team when present", async () => {
        render(
            <AddPlayerOverlay
                slotLabel="WR"
                players={[buildPlayer({ fullName: "Justin Jefferson", team: "MIN" })]}
                onSelect={vi.fn()}
                onClose={vi.fn()}
            />
        );

        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "justin" } });

        await waitFor(() => expect(screen.getByText("MIN")).toBeInTheDocument());
        expect(screen.getByText("WR")).toBeInTheDocument();
    });

    it("omits the team text when a player's team is null", async () => {
        render(
            <AddPlayerOverlay
                slotLabel="WR"
                players={[buildPlayer({ fullName: "Free Agent Guy", team: null })]}
                onSelect={vi.fn()}
                onClose={vi.fn()}
            />
        );

        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "free" } });

        await waitFor(() => expect(screen.getByText("Free Agent Guy")).toBeInTheDocument());
        // Position badge still shows, but there is no separate team node to find.
        expect(screen.queryByText("null")).not.toBeInTheDocument();
    });

    it("shows 'No players found' when the query matches nobody", async () => {
        render(
            <AddPlayerOverlay
                slotLabel="WR"
                players={[buildPlayer({ fullName: "Justin Jefferson" })]}
                onSelect={vi.fn()}
                onClose={vi.fn()}
            />
        );

        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "zzz-nobody" } });

        await waitFor(() => {
            expect(screen.getByText("No players found")).toBeInTheDocument();
        });
    });

    it("calls onSelect with the chosen player when a result row is clicked", async () => {
        const onSelect = vi.fn();
        const player = buildPlayer({ fullName: "Justin Jefferson" });
        render(
            <AddPlayerOverlay slotLabel="WR" players={[player]} onSelect={onSelect} onClose={vi.fn()} />
        );

        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "justin" } });

        const row = await screen.findByText("Justin Jefferson");
        fireEvent.click(row);

        expect(onSelect).toHaveBeenCalledWith(player);
    });

    it("caps visible results at 25 and reveals more via the 'Show more' button", async () => {
        const players = Array.from({ length: 30 }, (_, i) =>
            buildPlayer({ playerId: `p-${i}`, fullName: `Match Player ${i}` })
        );
        render(<AddPlayerOverlay slotLabel="WR" players={players} onSelect={vi.fn()} onClose={vi.fn()} />);

        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "match" } });

        await waitFor(() => {
            expect(screen.getAllByText(/^Match Player \d+$/)).toHaveLength(25);
        });
        expect(screen.getByText("Show more (5 remaining)")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Show more (5 remaining)"));

        await waitFor(() => {
            expect(screen.getAllByText(/^Match Player \d+$/)).toHaveLength(30);
        });
        expect(screen.queryByText(/Show more/)).not.toBeInTheDocument();
    });

    it("does not show the 'Show more' button when results fit within the cap", async () => {
        render(
            <AddPlayerOverlay
                slotLabel="WR"
                players={[buildPlayer({ fullName: "Justin Jefferson" })]}
                onSelect={vi.fn()}
                onClose={vi.fn()}
            />
        );

        fireEvent.change(screen.getByPlaceholderText("Search players..."), { target: { value: "justin" } });

        await waitFor(() => expect(screen.getByText("Justin Jefferson")).toBeInTheDocument());
        expect(screen.queryByText(/Show more/)).not.toBeInTheDocument();
    });

    it("calls onClose when the backdrop is clicked", () => {
        const onClose = vi.fn();
        const { container } = render(
            <AddPlayerOverlay slotLabel="WR" players={[buildPlayer()]} onSelect={vi.fn()} onClose={onClose} />
        );

        fireEvent.click(container.firstChild as Element);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when the card itself is clicked (click stops propagation)", () => {
        const onClose = vi.fn();
        render(
            <AddPlayerOverlay slotLabel="WR" players={[buildPlayer()]} onSelect={vi.fn()} onClose={onClose} />
        );

        fireEvent.click(screen.getByText("Add WR"));

        expect(onClose).not.toHaveBeenCalled();
    });

    it("calls onClose when the close button is clicked", () => {
        const onClose = vi.fn();
        render(
            <AddPlayerOverlay slotLabel="WR" players={[buildPlayer()]} onSelect={vi.fn()} onClose={onClose} />
        );

        fireEvent.click(screen.getByRole("button", { name: "Close" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when the Escape key is pressed", () => {
        const onClose = vi.fn();
        render(
            <AddPlayerOverlay slotLabel="WR" players={[buildPlayer()]} onSelect={vi.fn()} onClose={onClose} />
        );

        fireEvent.keyDown(window, { key: "Escape" });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose for other key presses", () => {
        const onClose = vi.fn();
        render(
            <AddPlayerOverlay slotLabel="WR" players={[buildPlayer()]} onSelect={vi.fn()} onClose={onClose} />
        );

        fireEvent.keyDown(window, { key: "Enter" });

        expect(onClose).not.toHaveBeenCalled();
    });

    it("removes the Escape key listener on unmount", () => {
        const onClose = vi.fn();
        const { unmount } = render(
            <AddPlayerOverlay slotLabel="WR" players={[buildPlayer()]} onSelect={vi.fn()} onClose={onClose} />
        );

        unmount();
        fireEvent.keyDown(window, { key: "Escape" });

        expect(onClose).not.toHaveBeenCalled();
    });
});
