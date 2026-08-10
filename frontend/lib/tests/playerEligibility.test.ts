import { describe, expect, it } from "vitest";
import { getEligiblePlayers } from "../playerEligibility";
import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";

const qb: AddPlayerOverlayPlayer = { playerId: "1", fullName: "QB One", position: "QB", team: "AAA" };
const rb: AddPlayerOverlayPlayer = { playerId: "2", fullName: "RB One", position: "RB", team: "BBB" };
const wr: AddPlayerOverlayPlayer = { playerId: "3", fullName: "WR One", position: "WR", team: "CCC" };
const te: AddPlayerOverlayPlayer = { playerId: "4", fullName: "TE One", position: "TE", team: "DDD" };
const dst: AddPlayerOverlayPlayer = { playerId: "5", fullName: "Defense", position: "DEF", team: "EEE" };

const players = [qb, rb, wr, te, dst];

describe("getEligiblePlayers", () => {
  it("restricts to the position(s) allowed for a strict slot like QB", () => {
    const result = getEligiblePlayers(players, {}, { id: "starter-0", label: "QB" });
    expect(result).toEqual([qb]);
  });

  it("allows RB, WR, or TE for a FLEX slot", () => {
    const result = getEligiblePlayers(players, {}, { id: "starter-6", label: "FLEX" });
    expect(result).toEqual([rb, wr, te]);
  });

  it("does not restrict by position for an unlisted slot label like BN", () => {
    const result = getEligiblePlayers(players, {}, { id: "bn-0", label: "BN" });
    expect(result).toEqual(players);
  });

  it("excludes a player already assigned to a different slot", () => {
    const assignments = { "starter-1": rb };
    const result = getEligiblePlayers(players, assignments, { id: "starter-6", label: "FLEX" });
    expect(result).toEqual([wr, te]);
  });

  it("does not exclude a player assigned to the slot being filled", () => {
    const assignments = { "starter-6": rb };
    const result = getEligiblePlayers(players, assignments, { id: "starter-6", label: "FLEX" });
    expect(result).toEqual([rb, wr, te]);
  });
});
