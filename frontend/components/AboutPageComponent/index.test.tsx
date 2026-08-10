import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutPageComponent } from "./index";

describe("AboutPageComponent", () => {
    it("renders the page heading and intro copy", () => {
        render(<AboutPageComponent />);

        expect(screen.getByRole("heading", { level: 1, name: "Trips Left" })).toBeInTheDocument();
        expect(screen.getByText("ABOUT")).toBeInTheDocument();
        expect(screen.getByText(/Trips Left helps fantasy football managers/)).toBeInTheDocument();
    });

    it("renders all three explainer cards with tag, title, and body", () => {
        render(<AboutPageComponent />);

        expect(screen.getByText("LEAGUE")).toBeInTheDocument();
        expect(screen.getByText("Mock or imported")).toBeInTheDocument();

        expect(screen.getByText("LINEUP")).toBeInTheDocument();
        expect(screen.getByText("Add, drop, swap")).toBeInTheDocument();

        expect(screen.getByText("INSIGHTS")).toBeInTheDocument();
        expect(screen.getByText("Three verdicts")).toBeInTheDocument();
    });
});
