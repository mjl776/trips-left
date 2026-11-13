import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LogoIcon } from "./LogoIcon";

describe("LogoIcon", () => {
    it("renders a 24×24 goalpost with stroke 2 and no Tailwind classes by default", () => {
        const { container } = render(<LogoIcon />);

        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
        expect(svg).toHaveAttribute("width", "24");
        expect(svg).toHaveAttribute("height", "24");
        expect(svg).toHaveAttribute("stroke-width", "2");
        expect(svg).toHaveAttribute("stroke", "currentColor");
        expect(svg).not.toHaveAttribute("class");
    });

    it("draws the uprights from the ends of the crossbar, and the stem from its center", () => {
        const { container } = render(<LogoIcon />);

        const paths = Array.from(container.querySelectorAll("path")).map((p) => p.getAttribute("d"));
        // Up from (1,1) to the crossbar's left end, across to its right end, up to (23,1).
        expect(paths).toContain("M1 1V8H23V1");
        expect(paths).toContain("M12 8V23");
    });

    it("is decorative so the surrounding link supplies the accessible name", () => {
        const { container } = render(<LogoIcon />);

        expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    });

    it("scales via the size prop and keeps the same viewBox", () => {
        const { container } = render(<LogoIcon size={48} className="custom" />);

        const svg = container.querySelector("svg");
        expect(svg).toHaveAttribute("width", "48");
        expect(svg).toHaveAttribute("height", "48");
        expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
        expect(svg).toHaveClass("custom");
    });
});
