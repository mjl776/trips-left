import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LineupBox from "./index";
import styles from "./page.module.css";

describe("LineupBox", () => {
    it("renders a mock league lineup with its name, points, and link", () => {
        render(
            <LineupBox
                name="My Squad"
                leagueId="league-123456789012"
                rosterId="roster-1"
                isMock
                createdAt="2026-01-15T00:00:00.000Z"
                pointsTotal={102.34}
            />,
        );

        const link = screen.getByRole("link");
        expect(link).toHaveAttribute(
            "href",
            "/lineup-management/view-lineup?leagueId=league-123456789012&rosterId=roster-1",
        );
        expect(screen.getByText("MOCK LEAGUE")).toBeInTheDocument();
        expect(screen.getByText("MOCK LEAGUE")).toHaveClass(styles.cyan);
        expect(screen.getByText("My Squad")).toBeInTheDocument();
        expect(screen.getByText("102.3")).toBeInTheDocument();
        expect(screen.getByText(/league-12345/)).toBeInTheDocument();
        expect(screen.getByText(/saved/)).toBeInTheDocument();
    });

    it("renders a Sleeper-imported lineup with the muted tag", () => {
        render(
            <LineupBox
                name="Imported Team"
                leagueId="league-abc"
                rosterId="roster-2"
                isMock={false}
                createdAt="2026-01-15T00:00:00.000Z"
                pointsTotal={50}
            />,
        );

        expect(screen.getByText("SLEEPER")).toBeInTheDocument();
        expect(screen.getByText("SLEEPER")).toHaveClass(styles.muted);
    });

    it("falls back to 'Untitled Lineup' when name is empty", () => {
        render(
            <LineupBox
                name=""
                leagueId="league-abc"
                rosterId="roster-2"
                isMock={false}
                createdAt="2026-01-15T00:00:00.000Z"
                pointsTotal={0}
            />,
        );

        expect(screen.getByText("Untitled Lineup")).toBeInTheDocument();
    });

    it("renders an em-dash when pointsTotal is null", () => {
        render(
            <LineupBox
                name="No Points Yet"
                leagueId="league-abc"
                rosterId="roster-3"
                isMock
                createdAt="2026-01-15T00:00:00.000Z"
                pointsTotal={null}
            />,
        );

        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("omits the saved date when createdAt is not a valid date", () => {
        render(
            <LineupBox
                name="Bad Date"
                leagueId="league-abc"
                rosterId="roster-4"
                isMock
                createdAt="not-a-date"
                pointsTotal={10}
            />,
        );

        expect(screen.queryByText(/saved/)).not.toBeInTheDocument();
    });
});
