import { beforeEach, describe, expect, it } from "vitest";
import { getSavedLineups, saveLineup, type SavedLineup } from "../savedLineups";

const lineup: SavedLineup = {
  rosterId: "roster-1",
  leagueId: "league-1",
  name: "My Lineup",
  isMock: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("savedLineups", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("getSavedLineups", () => {
    it("returns an empty array when nothing is stored", () => {
      expect(getSavedLineups()).toEqual([]);
    });

    it("returns the parsed list stored under the savedLineups key", () => {
      window.localStorage.setItem("savedLineups", JSON.stringify([lineup]));
      expect(getSavedLineups()).toEqual([lineup]);
    });
  });

  describe("saveLineup", () => {
    it("appends a new lineup when its rosterId isn't already saved", () => {
      saveLineup(lineup);
      const second: SavedLineup = { ...lineup, rosterId: "roster-2", name: "Second Lineup" };
      saveLineup(second);

      expect(getSavedLineups()).toEqual([lineup, second]);
    });

    it("updates an existing lineup in place when its rosterId matches", () => {
      saveLineup(lineup);
      saveLineup({ ...lineup, name: "Renamed Lineup" });

      const saved = getSavedLineups();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe("Renamed Lineup");
    });

    it("preserves the original createdAt when updating an existing lineup", () => {
      saveLineup(lineup);
      saveLineup({ ...lineup, name: "Renamed Lineup", createdAt: "2026-06-01T00:00:00.000Z" });

      expect(getSavedLineups()[0].createdAt).toBe(lineup.createdAt);
    });
  });
});
