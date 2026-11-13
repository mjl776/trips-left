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
                name: "Know your lineup before Sunday does.",
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

    it("gives each verdict card its own tone: yellow best, magenta worst, cyan dark horse", () => {
        render(<Homepage />);

        expect(screen.getByText("BEST PLAYER")).toHaveClass(styles.highlight);
        expect(screen.getByText("BEST PLAYER")).not.toHaveClass(styles.cyan);
        expect(screen.getByText("DARK HORSE")).toHaveClass(styles.cyan);
        expect(screen.getByText("WORST PLAYER")).toHaveClass(styles.magenta);
        expect(screen.getByText("WORST PLAYER")).not.toHaveClass(styles.cyan);
    });

    it("uses the highlight tone only on the Best Player tag", () => {
        const { container } = render(<Homepage />);

        const highlighted = container.querySelectorAll(`.${styles.highlight}`);
        expect(highlighted).toHaveLength(1);
        expect(highlighted[0]).toHaveTextContent("BEST PLAYER");
    });
});
