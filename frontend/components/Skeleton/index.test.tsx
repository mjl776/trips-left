import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Skeleton from "./index";

afterEach(cleanup);

describe("Skeleton", () => {
    it("renders an aria-hidden block with default size and badge radius", () => {
        const { container } = render(<Skeleton />);
        const block = container.querySelector("[data-skeleton]") as HTMLElement;

        expect(block).toHaveAttribute("aria-hidden", "true");
        expect(block.style.width).toBe("100%");
        expect(block.style.height).toBe("1rem");
        expect(block.className).toMatch(/badge/);
    });

    it("applies the given size, radius, and extra className", () => {
        const { container } = render(<Skeleton width="3rem" height="0.5rem" radius="round" className="extra" />);
        const block = container.querySelector("[data-skeleton]") as HTMLElement;

        expect(block.style.width).toBe("3rem");
        expect(block.style.height).toBe("0.5rem");
        expect(block.className).toMatch(/round/);
        expect(block.className).toMatch(/extra/);
    });
});
