import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";
import { SLOT_ELIGIBILITY } from "@/constants";

export type ActiveSlot = {
  id: string;
  label: string;
};

export function getEligiblePlayers(
  players: AddPlayerOverlayPlayer[],
  assignments: Record<string, AddPlayerOverlayPlayer>,
  activeSlot: ActiveSlot,
): AddPlayerOverlayPlayer[] {
  return players.filter((player) => {
    const isAssignedElsewhere = Object.entries(assignments).some(
      ([slotId, assignedPlayer]) =>
        slotId !== activeSlot.id && assignedPlayer.playerId === player.playerId,
    );
    if (isAssignedElsewhere) return false;

    const allowedPositions = SLOT_ELIGIBILITY[activeSlot.label];
    return allowedPositions ? allowedPositions.includes(player.position) : true;
  });
}
