import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CreateLineupBox from "./index";

describe("CreateLineupBox", () => {
    it("renders a link to the create-lineup flow with the plus icon and label", () => {
        render(<CreateLineupBox />);

        const link = screen.getByRole("link", { name: "Create a lineup" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/lineup-management/create");
        expect(screen.getByText("+")).toBeInTheDocument();
        expect(screen.getByText("Create a lineup")).toBeInTheDocument();
    });
});
