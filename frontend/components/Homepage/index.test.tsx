import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Homepage from "./index";
import styles from "./page.module.css";

describe("Homepage", () => {
    it("renders the hero heading, subtext, and CTAs", () => {
        render(<Homepage />);

        expect(
            screen.getByRole("heading", {
                level: 1,
                name: "Best, worst, dark horse — know your lineup before Sunday does.",
            }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Build a lineup against your real league/)).toBeInTheDocument();

        const createLink = screen.getByRole("link", { name: "Create a lineup" });
        expect(createLink).toHaveAttribute("href", "/lineup-management/create");

        const myLineupsLink = screen.getByRole("link", { name: "My lineups" });
        expect(myLineupsLink).toHaveAttribute("href", "/lineup-management");
    });

    it("renders the three verdict cards with correct tag, title, and body", () => {
        render(<Homepage />);

        expect(screen.getByText("BEST PLAYER")).toBeInTheDocument();
        expect(screen.getByText("Who is actually carrying you")).toBeInTheDocument();

        expect(screen.getByText("WORST PLAYER")).toBeInTheDocument();
        expect(screen.getByText("The starter to cut loose")).toBeInTheDocument();

        expect(screen.getByText("DARK HORSE")).toBeInTheDocument();
        expect(screen.getByText("Top-20% metrics, quiet box score")).toBeInTheDocument();
    });

    it("scopes the magenta tone to the worst-player card only", () => {
        render(<Homepage />);

        expect(screen.getByText("BEST PLAYER")).toHaveClass(styles.cyan);
        expect(screen.getByText("DARK HORSE")).toHaveClass(styles.cyan);
        expect(screen.getByText("WORST PLAYER")).toHaveClass(styles.magenta);
        expect(screen.getByText("WORST PLAYER")).not.toHaveClass(styles.cyan);
    });
});
