import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LineupInsightsPanel from "./index";
import type { LineupInsights } from "@/types/PlayerTypes";

const buildInsights = (overrides: Partial<LineupInsights> = {}): LineupInsights => ({
    rosterId: "roster-1",
    leagueId: "league-1",
    season: 2026,
    bestPlayer: {
        playerId: "p-best",
        fullName: "Justin Jefferson",
        position: "WR",
        team: "MIN",
        totalPoints: 289.4,
    },
    worstPlayer: {
        playerId: "p-worst",
        fullName: "Bench Warmer",
        position: "TE",
        team: "NYJ",
        totalPoints: 12.3,
    },
    darkHorse: {
        playerId: "p-dark",
        fullName: "Rising Star",
        position: "RB",
        team: "DET",
        stat: "rushing_epa",
        value: 45.6,
        leagueThreshold: 30.1,
        positionRank: 4,
        positionPlayerCount: 60,
        percentile: 92,
    },
    ...overrides,
});

describe("LineupInsightsPanel", () => {
    it("renders the microlabel heading", () => {
        render(<LineupInsightsPanel insights={buildInsights()} season={2026} />);
        expect(screen.getByText("LINEUP INSIGHTS")).toBeInTheDocument();
    });

    describe("full insights (best, worst, and dark horse all present)", () => {
        it("renders the best player card with cyan styling and season copy", () => {
            const { container } = render(<LineupInsightsPanel insights={buildInsights()} season={2026} />);

            const tag = screen.getByText("BEST PLAYER");
            expect(tag.className).toMatch(/cyan/);
            expect(tag.className).not.toMatch(/magenta/);
            expect(screen.getByText("289.4")).toBeInTheDocument();
            expect(screen.getByText("Justin Jefferson")).toBeInTheDocument();
            expect(
                screen.getByText(/Most fantasy points on your roster in 2026 under this league's scoring\./)
            ).toBeInTheDocument();
            expect(container.querySelector('[class*="cardEmpty"]')).not.toBeInTheDocument();
        });

        it("renders the worst player card with magenta styling and exclusion copy", () => {
            render(<LineupInsightsPanel insights={buildInsights()} season={2026} />);

            const tag = screen.getByText("WORST PLAYER");
            expect(tag.className).toMatch(/magenta/);
            expect(screen.getByText("12.3")).toBeInTheDocument();
            expect(screen.getByText("Bench Warmer")).toBeInTheDocument();
            expect(screen.getByText(/Kickers and defenses are excluded/)).toBeInTheDocument();
        });

        it("renders the dark horse card with cyan styling, EPA copy, and percentile bar", () => {
            render(<LineupInsightsPanel insights={buildInsights()} season={2026} />);

            const tag = screen.getByText("DARK HORSE");
            expect(tag.className).toMatch(/cyan/);
            expect(screen.getByText("45.6")).toBeInTheDocument();
            expect(screen.getByText("Rising Star")).toBeInTheDocument();
            expect(
                screen.getByText(/Season rushing EPA of 45\.6 clears the top-20% cutoff of 30\.1 for RBs\./)
            ).toBeInTheDocument();
            expect(screen.getByText(/RB RANK #4 OF 60/)).toBeInTheDocument();
            expect(screen.getByText(/92TH PERCENTILE/)).toBeInTheDocument();
        });

        it("falls back to the raw stat key when it isn't in the known EPA label map", () => {
            render(
                <LineupInsightsPanel
                    insights={buildInsights({
                        darkHorse: {
                            playerId: "p-dark",
                            fullName: "Rising Star",
                            position: "RB",
                            team: "DET",
                            // @ts-expect-error - intentionally an unmapped stat for this test
                            stat: "some_new_epa",
                            value: 45.6,
                            leagueThreshold: 30.1,
                            positionRank: 4,
                            positionPlayerCount: 60,
                            percentile: 92,
                        },
                    })}
                    season={2026}
                />
            );

            expect(screen.getByText(/Season some_new_epa of 45\.6/)).toBeInTheDocument();
        });

        it("renders '—' for the position rank when positionRank is null", () => {
            render(
                <LineupInsightsPanel
                    insights={buildInsights({
                        darkHorse: {
                            playerId: "p-dark",
                            fullName: "Rising Star",
                            position: "RB",
                            team: "DET",
                            stat: "rushing_epa",
                            value: 45.6,
                            leagueThreshold: 30.1,
                            positionRank: null,
                            positionPlayerCount: 60,
                            percentile: 92,
                        },
                    })}
                    season={2026}
                />
            );

            expect(screen.getByText(/RB RANK #— OF 60/)).toBeInTheDocument();
        });

        it("omits the percentile bar and rank label when percentile is null", () => {
            const { container } = render(
                <LineupInsightsPanel
                    insights={buildInsights({
                        darkHorse: {
                            playerId: "p-dark",
                            fullName: "Rising Star",
                            position: "RB",
                            team: "DET",
                            stat: "rushing_epa",
                            value: 45.6,
                            leagueThreshold: 30.1,
                            positionRank: 4,
                            positionPlayerCount: 60,
                            percentile: null,
                        },
                    })}
                    season={2026}
                />
            );

            expect(container.querySelector('[class*="barTrack"]')).not.toBeInTheDocument();
            expect(screen.queryByText(/POSITION RANK/)).not.toBeInTheDocument();
        });
    });

    describe("empty / null states", () => {
        it("renders neutral empty copy for all three cards when insights is null", () => {
            const { container } = render(<LineupInsightsPanel insights={null} season={2026} />);

            expect(screen.getByText("No players rostered yet.")).toBeInTheDocument();
            expect(
                screen.getByText("Needs at least two rostered players outside K and DEF before a worst player can be named.")
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "No rostered QB, RB, WR, or TE outside your best player currently clears the top-20% EPA cutoff for his position."
                )
            ).toBeInTheDocument();

            // No point values should render when every verdict is null.
            expect(screen.queryByText(/^\d+\.\d$/)).not.toBeInTheDocument();

            // Empty states render as neutral cardEmpty text, not magenta/alert styling.
            const emptyNodes = container.querySelectorAll('[class*="cardEmpty"]');
            expect(emptyNodes).toHaveLength(3);
            for (const node of emptyNodes) {
                expect(node.className).not.toMatch(/magenta/);
            }
        });

        it("renders a neutral empty worst-player card even when best and dark horse are present", () => {
            const { container } = render(
                <LineupInsightsPanel insights={buildInsights({ worstPlayer: null })} season={2026} />
            );

            expect(
                screen.getByText("Needs at least two rostered players outside K and DEF before a worst player can be named.")
            ).toBeInTheDocument();
            expect(screen.queryByText("Bench Warmer")).not.toBeInTheDocument();
            expect(screen.queryByText("12.3")).not.toBeInTheDocument();
            // The WORST PLAYER tag itself keeps its magenta identity even though the card body is neutral.
            const tag = screen.getByText("WORST PLAYER");
            expect(tag.className).toMatch(/magenta/);
            const worstCardEmpty = Array.from(container.querySelectorAll('[class*="cardEmpty"]')).find((node) =>
                node.textContent?.includes("Needs at least two")
            );
            expect(worstCardEmpty?.className).not.toMatch(/magenta/);
        });

        it("renders a neutral empty best-player card when bestPlayer is null", () => {
            render(<LineupInsightsPanel insights={buildInsights({ bestPlayer: null })} season={2026} />);

            expect(screen.getByText("No players rostered yet.")).toBeInTheDocument();
            expect(screen.queryByText("Justin Jefferson")).not.toBeInTheDocument();
        });

        it("renders a neutral empty dark-horse card when darkHorse is null", () => {
            render(<LineupInsightsPanel insights={buildInsights({ darkHorse: null })} season={2026} />);

            expect(
                screen.getByText(
                    "No rostered QB, RB, WR, or TE outside your best player currently clears the top-20% EPA cutoff for his position."
                )
            ).toBeInTheDocument();
            expect(screen.queryByText("Rising Star")).not.toBeInTheDocument();
        });
    });
});
