import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Toast from "./index";
import styles from "./page.module.css";

afterEach(cleanup);

describe("Toast", () => {
    it("renders the title and message", () => {
        render(<Toast variant="success" title="Lineup created" message="My Lineup" onDismiss={vi.fn()} />);

        expect(screen.getByText("Lineup created")).toBeInTheDocument();
        expect(screen.getByText("My Lineup")).toBeInTheDocument();
    });

    it("omits the message element when no message is passed", () => {
        const { container } = render(<Toast variant="success" title="Lineup created" onDismiss={vi.fn()} />);

        expect(screen.getByText("Lineup created")).toBeInTheDocument();
        expect(container.querySelectorAll("p")).toHaveLength(1);
    });

    it("applies the success variant class", () => {
        const { container } = render(<Toast variant="success" title="Lineup created" onDismiss={vi.fn()} />);

        const toast = container.firstElementChild as HTMLElement;
        expect(toast).toHaveClass(styles.success);
        expect(toast).not.toHaveClass(styles.error);
    });

    it("applies the error variant class, which is not magenta-styled", () => {
        const { container } = render(<Toast variant="error" title="Couldn't add player" onDismiss={vi.fn()} />);

        const toast = container.firstElementChild as HTMLElement;
        expect(toast).toHaveClass(styles.error);
        expect(toast).not.toHaveClass(styles.success);
        expect(toast.className).not.toMatch(/magenta/);
    });

    it("hides the icon from assistive tech", () => {
        const { container } = render(<Toast variant="error" title="Couldn't add player" onDismiss={vi.fn()} />);

        expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    });

    it("calls onDismiss when the Dismiss button is clicked", () => {
        const onDismiss = vi.fn();
        render(<Toast variant="success" title="Lineup created" onDismiss={onDismiss} />);

        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
