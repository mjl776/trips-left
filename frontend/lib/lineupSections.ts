import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";

type RosterPlayer = {
  slot: string | null;
  player: AddPlayerOverlayPlayer;
};

export function getStarterLabels(rosterPositions: string[]): string[] {
  return rosterPositions.filter((slot) => slot !== "BN");
}

export function buildStarterAssignments(
  starterLabels: string[],
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

  return assignments;
}

export function getBenchPlayers(rosterPlayers: RosterPlayer[]): AddPlayerOverlayPlayer[] {
  return rosterPlayers.filter((rosterPlayer) => rosterPlayer.slot === "BN").map((rosterPlayer) => rosterPlayer.player);
}
