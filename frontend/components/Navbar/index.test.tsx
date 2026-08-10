import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
    usePathname: () => mockUsePathname(),
}));

import Navbar from "./index";

describe("Navbar", () => {
    it("renders the logo and all nav links", () => {
        mockUsePathname.mockReturnValue("/");
        render(<Navbar />);

        expect(screen.getByText("Trips")).toBeInTheDocument();
        expect(screen.getByText("Left")).toBeInTheDocument();
        expect(screen.getAllByRole("link", { name: "Home" }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole("link", { name: "Lineup" }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole("link", { name: "About" }).length).toBeGreaterThan(0);
    });

    it("marks the Home link active when pathname is '/'", () => {
        mockUsePathname.mockReturnValue("/");
        render(<Navbar />);

        const [homeLink] = screen.getAllByRole("link", { name: "Home" });
        const [lineupLink] = screen.getAllByRole("link", { name: "Lineup" });
        const [aboutLink] = screen.getAllByRole("link", { name: "About" });

        expect(homeLink.className).toMatch(/linkActive/);
        expect(lineupLink.className).not.toMatch(/linkActive/);
        expect(aboutLink.className).not.toMatch(/linkActive/);
    });

    it("marks the Lineup link active when pathname is '/lineup-management'", () => {
        mockUsePathname.mockReturnValue("/lineup-management");
        render(<Navbar />);

        const [homeLink] = screen.getAllByRole("link", { name: "Home" });
        const [lineupLink] = screen.getAllByRole("link", { name: "Lineup" });

        expect(lineupLink.className).toMatch(/linkActive/);
        expect(homeLink.className).not.toMatch(/linkActive/);
    });

    it("marks the About link active when pathname is '/about'", () => {
        mockUsePathname.mockReturnValue("/about");
        render(<Navbar />);

        const [aboutLink] = screen.getAllByRole("link", { name: "About" });
        expect(aboutLink.className).toMatch(/linkActive/);
    });

    it("marks no nav link active for an unrelated pathname", () => {
        mockUsePathname.mockReturnValue("/lineup-management/view-lineup");
        render(<Navbar />);

        for (const label of ["Home", "Lineup", "About"]) {
            for (const link of screen.getAllByRole("link", { name: label })) {
                expect(link.className).not.toMatch(/linkActive/);
            }
        }
    });

    it("does not render the mobile menu list until the menu button is opened", () => {
        mockUsePathname.mockReturnValue("/");
        render(<Navbar />);

        expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
        // Only the three desktop links should be present (mobile menu not rendered).
        expect(screen.getAllByRole("link", { name: "Home" })).toHaveLength(1);
    });

    it("opens the mobile menu, exposing a second set of nav links, when the menu button is clicked", () => {
        mockUsePathname.mockReturnValue("/");
        render(<Navbar />);

        fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

        expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
        expect(screen.getAllByRole("link", { name: "Home" })).toHaveLength(2);
    });

    it("closes the mobile menu again on a second menu button click", () => {
        mockUsePathname.mockReturnValue("/");
        render(<Navbar />);

        fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
        fireEvent.click(screen.getByRole("button", { name: "Close menu" }));

        expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
        expect(screen.getAllByRole("link", { name: "Home" })).toHaveLength(1);
    });

    it("closes the mobile menu when a mobile link is clicked", () => {
        mockUsePathname.mockReturnValue("/");
        render(<Navbar />);

        fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
        const mobileAboutLink = screen.getAllByRole("link", { name: "About" })[1];
        fireEvent.click(mobileAboutLink);

        expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
        expect(screen.getAllByRole("link", { name: "About" })).toHaveLength(1);
    });

    it("marks the active mobile link when the menu is open", () => {
        mockUsePathname.mockReturnValue("/about");
        render(<Navbar />);

        fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
        const mobileAboutLink = screen.getAllByRole("link", { name: "About" })[1];

        expect(mobileAboutLink.className).toMatch(/mobileLinkActive/);
    });
});
