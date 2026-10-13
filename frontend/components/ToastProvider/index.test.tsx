import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FC } from "react";
import ToastProvider, { useToast, type ShowToastOptions } from "./index";

const Trigger: FC<{ label: string; options: ShowToastOptions }> = ({ label, options }) => {
    const { showToast } = useToast();
    return (
        <button type="button" onClick={() => showToast(options)}>
            {label}
        </button>
    );
};

function renderWithTriggers() {
    return render(
        <ToastProvider>
            <Trigger label="show success" options={{ variant: "success", title: "Lineup created", message: "My Lineup" }} />
            <Trigger label="show error" options={{ variant: "error", title: "Couldn't add player" }} />
            <Trigger label="show short" options={{ variant: "success", title: "Short one", duration: 1000 }} />
        </ToastProvider>,
    );
}

function advance(ms: number) {
    act(() => {
        vi.advanceTimersByTime(ms);
    });
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("ToastProvider", () => {
    it("renders both live regions before any toast is shown", () => {
        renderWithTriggers();

        expect(screen.getByRole("status")).toBeEmptyDOMElement();
        expect(screen.getByRole("alert")).toBeEmptyDOMElement();
        expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
        expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    });

    it("renders a success toast inside the status region", () => {
        renderWithTriggers();
        fireEvent.click(screen.getByRole("button", { name: "show success" }));

        const status = screen.getByRole("status");
        expect(within(status).getByText("Lineup created")).toBeInTheDocument();
        expect(within(status).getByText("My Lineup")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    });

    it("renders an error toast inside the alert region", () => {
        renderWithTriggers();
        fireEvent.click(screen.getByRole("button", { name: "show error" }));

        expect(within(screen.getByRole("alert")).getByText("Couldn't add player")).toBeInTheDocument();
        expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("does not move focus when a toast appears", () => {
        renderWithTriggers();
        const trigger = screen.getByRole("button", { name: "show success" });
        trigger.focus();
        fireEvent.click(trigger);

        expect(trigger).toHaveFocus();
    });

    it("auto-dismisses a success toast after 4000 ms", () => {
        renderWithTriggers();
        fireEvent.click(screen.getByRole("button", { name: "show success" }));

        advance(3999);
        expect(screen.getByText("Lineup created")).toBeInTheDocument();
        advance(1);
        expect(screen.queryByText("Lineup created")).not.toBeInTheDocument();
    });

    it("auto-dismisses an error toast after 6000 ms", () => {
        renderWithTriggers();
        fireEvent.click(screen.getByRole("button", { name: "show error" }));

        advance(5999);
        expect(screen.getByText("Couldn't add player")).toBeInTheDocument();
        advance(1);
        expect(screen.queryByText("Couldn't add player")).not.toBeInTheDocument();
    });

    it("honours a custom duration", () => {
        renderWithTriggers();
        fireEvent.click(screen.getByRole("button", { name: "show short" }));

        advance(999);
        expect(screen.getByText("Short one")).toBeInTheDocument();
        advance(1);
        expect(screen.queryByText("Short one")).not.toBeInTheDocument();
    });

    it("replaces the current toast and restarts the timer on a second showToast", () => {
        renderWithTriggers();
        fireEvent.click(screen.getByRole("button", { name: "show success" }));
        advance(3000);

        fireEvent.click(screen.getByRole("button", { name: "show error" }));
        expect(screen.queryByText("Lineup created")).not.toBeInTheDocument();
        expect(screen.getByText("Couldn't add player")).toBeInTheDocument();

        // The first toast's timer (1000 ms left) must not dismiss the replacement.
        advance(5999);
        expect(screen.getByText("Couldn't add player")).toBeInTheDocument();
        advance(1);
        expect(screen.queryByText("Couldn't add player")).not.toBeInTheDocument();
    });

    it("pauses the timer while hovered and restarts it at the full duration on leave", () => {
        renderWithTriggers();
        fireEvent.click(screen.getByRole("button", { name: "show success" }));
        const title = screen.getByText("Lineup created");
        advance(3000);

        fireEvent.mouseEnter(title);
        advance(10000);
        expect(screen.getByText("Lineup created")).toBeInTheDocument();

        fireEvent.mouseLeave(title);
        advance(3999);
        expect(screen.getByText("Lineup created")).toBeInTheDocument();
        advance(1);
        expect(screen.queryByText("Lineup created")).not.toBeInTheDocument();
    });

    it("pauses the timer while focused and restarts it when focus leaves the toast", () => {
        renderWithTriggers();
        fireEvent.click(screen.getByRole("button", { name: "show success" }));
        const dismiss = screen.getByRole("button", { name: "Dismiss" });

        fireEvent.focus(dismiss);
        advance(10000);
        expect(screen.getByText("Lineup created")).toBeInTheDocument();

        fireEvent.blur(dismiss, { relatedTarget: screen.getByRole("button", { name: "show error" }) });
        advance(3999);
        expect(screen.getByText("Lineup created")).toBeInTheDocument();
        advance(1);
        expect(screen.queryByText("Lineup created")).not.toBeInTheDocument();
    });

    it("dismisses on Escape", () => {
        renderWithTriggers();
        fireEvent.click(screen.getByRole("button", { name: "show success" }));

        fireEvent.keyDown(window, { key: "Escape" });

        expect(screen.queryByText("Lineup created")).not.toBeInTheDocument();
    });

    it("dismisses when the close button is clicked", () => {
        renderWithTriggers();
        fireEvent.click(screen.getByRole("button", { name: "show error" }));

        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

        expect(screen.queryByText("Couldn't add player")).not.toBeInTheDocument();
    });

    it("throws when useToast is called outside the provider", () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        expect(() => render(<Trigger label="orphan" options={{ variant: "success", title: "x" }} />)).toThrow(
            "useToast must be used inside a ToastProvider",
        );

        consoleErrorSpy.mockRestore();
    });
});
