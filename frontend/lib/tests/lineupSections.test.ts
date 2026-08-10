import { describe, expect, it } from "vitest";
import { buildStarterAssignments, getBenchPlayers, getStarterLabels } from "../lineupSections";
import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";

const rosterPositions = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF", "BN", "BN"];

const qb: AddPlayerOverlayPlayer = { playerId: "1", fullName: "QB One", position: "QB", team: "AAA" };
const rb1: AddPlayerOverlayPlayer = { playerId: "2", fullName: "RB One", position: "RB", team: "BBB" };
const rb2: AddPlayerOverlayPlayer = { playerId: "3", fullName: "RB Two", position: "RB", team: "CCC" };
const bench1: AddPlayerOverlayPlayer = { playerId: "4", fullName: "Bench One", position: "WR", team: "DDD" };
const bench2: AddPlayerOverlayPlayer = { playerId: "5", fullName: "Bench Two", position: "TE", team: "EEE" };

describe("getStarterLabels", () => {
  it("filters out the BN slots and keeps the rest in order", () => {
    expect(getStarterLabels(rosterPositions)).toEqual([
      "QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF",
    ]);
  });

  it("returns an empty array when every slot is BN", () => {
    expect(getStarterLabels(["BN", "BN"])).toEqual([]);
  });
});

describe("buildStarterAssignments", () => {
  it("maps rostered starters onto their slot key by occurrence order", () => {
    const starterLabels = ["QB", "RB", "RB"];
    const rosterPlayers = [
      { slot: "QB", player: qb },
      { slot: "RB", player: rb1 },
      { slot: "RB", player: rb2 },
    ];

    expect(buildStarterAssignments(starterLabels, rosterPlayers)).toEqual({
      "starter-0": qb,
      "starter-1": rb1,
      "starter-2": rb2,
    });
  });

  it("leaves a slot key absent when no rostered player occupies that starter slot", () => {
    const starterLabels = ["QB", "RB"];
    const rosterPlayers = [{ slot: "QB", player: qb }];

    expect(buildStarterAssignments(starterLabels, rosterPlayers)).toEqual({
      "starter-0": qb,
    });
  });

  it("ignores rostered players with a null slot", () => {
    const starterLabels = ["QB"];
    const rosterPlayers = [
      { slot: null, player: bench1 },
      { slot: "QB", player: qb },
    ];

    expect(buildStarterAssignments(starterLabels, rosterPlayers)).toEqual({
      "starter-0": qb,
    });
  });
});

describe("getBenchPlayers", () => {
  it("returns only the players whose slot is BN", () => {
    const rosterPlayers = [
      { slot: "QB", player: qb },
      { slot: "BN", player: bench1 },
      { slot: "BN", player: bench2 },
    ];

    expect(getBenchPlayers(rosterPlayers)).toEqual([bench1, bench2]);
  });

  it("returns an empty array when nobody is benched", () => {
    expect(getBenchPlayers([{ slot: "QB", player: qb }])).toEqual([]);
  });
});
