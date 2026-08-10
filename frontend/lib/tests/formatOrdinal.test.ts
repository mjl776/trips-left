import { describe, expect, it } from "vitest";
import { formatOrdinal } from "../formatOrdinal";

describe("formatOrdinal", () => {
    it("appends 'st' for values ending in 1 (except 11)", () => {
        expect(formatOrdinal(1)).toBe("1st");
        expect(formatOrdinal(21)).toBe("21st");
        expect(formatOrdinal(91)).toBe("91st");
    });

    it("appends 'nd' for values ending in 2 (except 12)", () => {
        expect(formatOrdinal(2)).toBe("2nd");
        expect(formatOrdinal(92)).toBe("92nd");
    });

    it("appends 'rd' for values ending in 3 (except 13)", () => {
        expect(formatOrdinal(3)).toBe("3rd");
        expect(formatOrdinal(23)).toBe("23rd");
    });

    it("appends 'th' for the 11th-13th teen exceptions", () => {
        expect(formatOrdinal(11)).toBe("11th");
        expect(formatOrdinal(12)).toBe("12th");
        expect(formatOrdinal(13)).toBe("13th");
        expect(formatOrdinal(111)).toBe("111th");
        expect(formatOrdinal(112)).toBe("112th");
        expect(formatOrdinal(113)).toBe("113th");
    });

    it("appends 'th' for all other values", () => {
        expect(formatOrdinal(0)).toBe("0th");
        expect(formatOrdinal(4)).toBe("4th");
        expect(formatOrdinal(100)).toBe("100th");
    });

    it("rounds non-integer input before formatting", () => {
        expect(formatOrdinal(1.4)).toBe("1st");
        expect(formatOrdinal(2.6)).toBe("3rd");
    });
});
