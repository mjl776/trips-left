import { describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useDialog } from "@/lib/useDialog";

function Dialog({ onClose, withControls = true, focusSecond = false }: {
    onClose: () => void;
    withControls?: boolean;
    focusSecond?: boolean;
}) {
    const secondRef = useRef<HTMLButtonElement>(null);
    const ref = useDialog<HTMLDivElement>(onClose, focusSecond ? secondRef : undefined);
    return (
        <div ref={ref} role="dialog" tabIndex={-1}>
            {withControls && (
                <>
                    <button type="button">First</button>
                    <button type="button" ref={secondRef}>Second</button>
                    <button type="button">Last</button>
                </>
            )}
        </div>
    );
}

function Harness(props: { withControls?: boolean; focusSecond?: boolean }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>Open</button>
            {open && <Dialog onClose={() => setOpen(false)} {...props} />}
        </>
    );
}

function openDialog() {
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    return opener;
}

describe("useDialog", () => {
    it("focuses the dialog when no initial focus target is given", () => {
        render(<Harness />);
        openDialog();
        expect(screen.getByRole("dialog")).toHaveFocus();
    });

    it("focuses the initial focus target when given", () => {
        render(<Harness focusSecond />);
        openDialog();
        expect(screen.getByRole("button", { name: "Second" })).toHaveFocus();
    });

    it("wraps Tab from the last control to the first", () => {
        render(<Harness />);
        openDialog();
        screen.getByRole("button", { name: "Last" }).focus();

        fireEvent.keyDown(window, { key: "Tab" });

        expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    });

    it("wraps Shift+Tab from the first control, or the dialog itself, to the last", () => {
        render(<Harness />);
        openDialog();

        fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
        expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();

        screen.getByRole("button", { name: "First" }).focus();
        fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
        expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
    });

    it("pulls focus back in when it has escaped the dialog", () => {
        render(<Harness />);
        const opener = openDialog();
        opener.focus();

        fireEvent.keyDown(window, { key: "Tab" });

        expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    });

    it("keeps focus on the dialog when it has no focusable children", () => {
        render(<Harness withControls={false} />);
        openDialog();

        fireEvent.keyDown(window, { key: "Tab" });

        expect(screen.getByRole("dialog")).toHaveFocus();
    });

    it("closes on Escape and returns focus to the opener", () => {
        render(<Harness />);
        const opener = openDialog();

        fireEvent.keyDown(window, { key: "Escape" });

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(opener).toHaveFocus();
    });

    it("uses the latest onClose without re-running the mount effect", () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = render(<Dialog onClose={first} />);
        rerender(<Dialog onClose={second} />);

        fireEvent.keyDown(window, { key: "Escape" });

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });
});
