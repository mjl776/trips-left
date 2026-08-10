import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SquareLabel from "./index";
import styles from "./page.module.css";

describe("SquareLabel", () => {
    it("defaults to the cyan tone when none is provided", () => {
        render(<SquareLabel labelText="Best Player" />);

        const label = screen.getByText("Best Player");
        expect(label).toHaveClass(styles.cyan);
        expect(label).not.toHaveClass(styles.magenta);
    });

    it("renders the cyan tone explicitly", () => {
        render(<SquareLabel labelText="Dark Horse" tone="cyan" />);

        const label = screen.getByText("Dark Horse");
        expect(label).toHaveClass(styles.cyan);
        expect(label).not.toHaveClass(styles.magenta);
    });

    it("renders the magenta tone for a worst-player style badge", () => {
        render(<SquareLabel labelText="Worst Player" tone="magenta" />);

        const label = screen.getByText("Worst Player");
        expect(label).toHaveClass(styles.magenta);
        expect(label).not.toHaveClass(styles.cyan);
    });
});
