"use client";

import { useState } from "react";
import AddPlayerOverlay from "@/components/AddPlayerOverlay";
import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";
import { SLOT_ELIGIBILITY } from "@/constants";
import React from "react";

export type ActiveSlot = {
  id: string;
  label: string;
};

export function usePlayerPicker(
  players: AddPlayerOverlayPlayer[],
  assignments: Record<string, AddPlayerOverlayPlayer>,
  onAssign: (slotId: string, player: AddPlayerOverlayPlayer) => void,
) {
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);

  const eligiblePlayers = activeSlot
    ? players.filter((player) => {
        const isAssignedElsewhere = Object.entries(assignments).some(
          ([slotId, assignedPlayer]) =>
            slotId !== activeSlot.id && assignedPlayer.playerId === player.playerId,
        );
        if (isAssignedElsewhere) return false;

        const allowedPositions = SLOT_ELIGIBILITY[activeSlot.label];
        return allowedPositions ? allowedPositions.includes(player.position) : true;
      })
    : [];

  const picker = activeSlot && (
    <AddPlayerOverlay
      slotLabel={activeSlot.label}
      players={eligiblePlayers}
      onSelect={(player) => {
        onAssign(activeSlot.id, player);
        setActiveSlot(null);
      }}
      onClose={() => setActiveSlot(null)}
    />
  );

  return { openPicker: setActiveSlot, picker };
}
