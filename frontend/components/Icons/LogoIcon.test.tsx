import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LogoIcon } from "./LogoIcon";

describe("LogoIcon", () => {
    it("renders an svg with the expected viewBox and four line segments", () => {
        const { container } = render(<LogoIcon />);

        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute("viewBox", "0 0 36 40");
        expect(container.querySelectorAll("line")).toHaveLength(4);
    });

    it("applies the default className when none is provided", () => {
        const { container } = render(<LogoIcon />);

        expect(container.querySelector("svg")).toHaveClass("h-7", "w-7");
    });

    it("applies a custom className when provided", () => {
        const { container } = render(<LogoIcon className="h-10 w-10 text-red-500" />);

        const svg = container.querySelector("svg");
        expect(svg).toHaveClass("h-10", "w-10", "text-red-500");
        expect(svg).not.toHaveClass("h-7");
    });
});
