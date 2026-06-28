import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";

type RosterPlayer = {
  slot: string | null;
  player: AddPlayerOverlayPlayer;
};

export function splitRosterPositions(rosterPositions: string[]) {
  console.log('roster-positions', rosterPositions);
  return {
    starterLabels: rosterPositions.filter((slot) => slot !== "BN"),
    benchLabels: rosterPositions.filter((slot) => slot === "BN"),
  };
}

export function buildAssignments(
  starterLabels: string[],
  benchLabels: string[],
  rosterPlayers: RosterPlayer[],
): Record<string, AddPlayerOverlayPlayer> {
  const playersBySlot: Record<string, AddPlayerOverlayPlayer[]> = {};
  for (const rosterPlayer of rosterPlayers) {
    if (!rosterPlayer.slot) continue;
    playersBySlot[rosterPlayer.slot] = playersBySlot[rosterPlayer.slot] ?? [];
    playersBySlot[rosterPlayer.slot].push(rosterPlayer.player);
  }

  const assignments: Record<string, AddPlayerOverlayPlayer> = {};

  starterLabels.forEach((label, index) => {
    const player = playersBySlot[label]?.shift();
    if (player) assignments[`starter-${index}`] = player;
  });

  benchLabels.forEach((label, index) => {
    const player = playersBySlot[label]?.shift();
    console.log(player);
    if (player) assignments[`bench-${index}`] = player;
  });

  return assignments;
}
