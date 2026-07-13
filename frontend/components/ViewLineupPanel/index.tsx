"use client";

import LineupSlotsList from "../LineupSlotsList";
import type { PlayerStats } from "../LineupSlotsList";
import { FC, useEffect, useState } from "react";
import AddPlayerOverlay, {
  AddPlayerOverlayPlayer,
} from "@/components/AddPlayerOverlay";
import { ActiveSlot, getEligiblePlayers } from "@/lib/playerEligibility";
import { splitRosterPositions, buildAssignments } from "@/lib/lineupSections";
import { saveLineup } from "@/lib/savedLineups";
import styles from "./page.module.css";
import { useSearchParams } from "next/navigation";
import {
  fetchPlayerStatsByPlayerId,
  PROJECTION_BASE_SEASON,
} from "@/lib/playerStats";
import IndividualPlayerCardOverlay from "@/components/IndividualPlayerCardOverlay";
import { LineupInsights } from "@/types/PlayerTypes";
import { API_BASE_URL } from "@/lib/api";

type ActivePlayerViewSlot = {
  id: string;
  playerId: string;
};

const ViewLineupPanel: FC = () => {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get("leagueId");
  const rosterId = searchParams.get("rosterId");

  const [players, setPlayers] = useState<AddPlayerOverlayPlayer[]>([]);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [activePlayerViewSlot, setActivePlayerViewSlot] =
    useState<ActivePlayerViewSlot | null>(null);
  const [assignments, setAssignments] = useState<
    Record<string, AddPlayerOverlayPlayer>
  >({});
  const [starterLabels, setStarterLabels] = useState<string[]>([]);
  const [benchLabels, setBenchLabels] = useState<string[]>([]);
  const [playerStatsByPlayerId, setPlayerStatsByPlayerId] = useState<
    Record<string, PlayerStats>
  >({});
  const [lineupInsights, setLineupInsights] = useState<LineupInsights | null>(
    null,
  );
  const [lineupName, setLineupName] = useState("");
  const [originalAssignments, setOriginalAssignments] = useState<
    Record<string, AddPlayerOverlayPlayer>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  const eligiblePlayers = activeSlot
    ? getEligiblePlayers(players, assignments, activeSlot)
    : [];

  const hasUnsavedChanges = Object.keys({ ...assignments, ...originalAssignments }).some(
    (slotId) => assignments[slotId]?.playerId !== originalAssignments[slotId]?.playerId,
  );

  const handleRemovePlayer = (slotId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const loadLineup = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/view-lineup?rosterId=${rosterId}&leagueId=${leagueId}`,
      );
      const roster = await response.json();
      const { starterLabels, benchLabels } = splitRosterPositions(
        roster.league.rosterPositions,
      );
      setStarterLabels(starterLabels);
      setBenchLabels(benchLabels);
      const loadedAssignments = buildAssignments(
        starterLabels,
        benchLabels,
        roster.rosterPlayers,
      );
      setAssignments(loadedAssignments);
      setOriginalAssignments(loadedAssignments);
      setLineupName(roster.name);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadLineup();
  }, [rosterId, leagueId]);

  const handleSaveLineup = async () => {
    if (!rosterId || !leagueId) return;

    const slotLabel = (slotId: string) => {
      const [section, indexStr] = slotId.split("-");
      const index = Number(indexStr);
      return section === "starter" ? starterLabels[index] : benchLabels[index];
    };

    const slotIds = new Set([
      ...Object.keys(originalAssignments),
      ...Object.keys(assignments),
    ]);

    const removals: string[] = [];
    const additions: { playerId: string; slot: string }[] = [];

    slotIds.forEach((slotId) => {
      const before = originalAssignments[slotId];
      const after = assignments[slotId];

      if (before && !after) {
        removals.push(before.playerId);
      } else if (!before && after) {
        additions.push({ playerId: after.playerId, slot: slotLabel(slotId) });
      } else if (before && after && before.playerId !== after.playerId) {
        // Same slot, different player (e.g. removed then re-filled before saving) —
        // needs both: freeing the old player's spot and adding the new one.
        removals.push(before.playerId);
        additions.push({ playerId: after.playerId, slot: slotLabel(slotId) });
      }
    });

    setIsSaving(true);
    try {
      // Removals must land before additions: a same-slot replacement adds a player
      // into a slot the backend still considers occupied until the old one is removed.
      const removalResults = await Promise.allSettled(
        removals.map((playerId) =>
          fetch(`${API_BASE_URL}/remove-player`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rosterId, leagueId, playerId }),
          }).then((response) => {
            if (!response.ok) throw new Error("Failed to remove player");
          }),
        ),
      );
      const additionResults = await Promise.allSettled(
        additions.map(({ playerId, slot }) =>
          fetch(`${API_BASE_URL}/add-player`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rosterId, leagueId, playerId, slot }),
          }).then((response) => {
            if (!response.ok) throw new Error("Failed to add player");
          }),
        ),
      );

      const results = [...removalResults, ...additionResults];
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length > 0) {
        alert(`${failures.length} change(s) failed to save. Reloading lineup.`);
      } else {
        saveLineup({
          rosterId,
          leagueId,
          name: lineupName,
          createdAt: new Date().toISOString(),
        });
      }
    } finally {
      await loadLineup();
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/players`,
        );
        const data = await response.json();
        setPlayers(data);
      } catch (error) {
        console.error(error);
      }
    };
    loadPlayers();
  }, [rosterId, leagueId]);

  useEffect(() => {
    const loadPlayerStats = async () => {
      try {
        const playerIds = Object.values(assignments).map(
          (player) => player.playerId,
        );
        if (playerIds.length === 0) return;
        const data = await fetchPlayerStatsByPlayerId(
          playerIds,
          PROJECTION_BASE_SEASON,
          leagueId,
        );
        setPlayerStatsByPlayerId(data);
      } catch (error) {
        console.log(error);
      }
    };
    loadPlayerStats();
  }, [assignments, leagueId]);

  useEffect(() => {
    const loadPlayerInsights = async () => {
      try {
        const params = new URLSearchParams({
          leagueId: String(leagueId),
          rosterId: String(rosterId),
          season: String(2025),
        });
        const response = await fetch(
          `${API_BASE_URL}/lineup-insights?${params}`,
        );
        if (!response.ok) {
          throw Error("Could not fetch player lineup insights");
        }
        const data = await response.json();
        console.log(data);
        setLineupInsights(data);
      } catch (error) {
        console.log(error);
      }
    };
    loadPlayerInsights();
  }, [assignments, rosterId, leagueId]);

  return (
    <>
      <div className={styles.stack}>
        <h1 className={styles.title}>{lineupName || "Untitled Lineup"}</h1>
        <LineupSlotsList
          sections={[
            {
              title: "Starters",
              slots: starterLabels.map((label, index) => {
                const slotId = `starter-${index}`;
                const player = assignments[slotId];
                return {
                  id: slotId,
                  label,
                  assignedPlayerId: player?.playerId,
                  assignedPlayerName: player?.fullName,
                  assignedPlayerStats: player
                    ? playerStatsByPlayerId[player.playerId]
                    : undefined,
                  isBestPlayer: player
                    ? player.playerId === lineupInsights?.bestPlayer?.playerId
                    : undefined,
                  isWorstPlayer: player
                    ? player.playerId === lineupInsights?.worstPlayer?.playerId
                    : undefined,
                  isDarkHorse: player
                    ? player.playerId === lineupInsights?.darkHorse?.playerId
                    : undefined,
                };
              }),
            },
            {
              title: "Bench",
              slots: benchLabels.map((label, index) => {
                const slotId = `bench-${index}`;
                const player = assignments[slotId];
                return {
                  id: slotId,
                  label,
                  assignedPlayerId: player?.playerId,
                  assignedPlayerName: player?.fullName,
                  assignedPlayerStats: player
                    ? playerStatsByPlayerId[player.playerId]
                    : undefined,
                  isBestPlayer: player
                    ? player.playerId === lineupInsights?.bestPlayer?.playerId
                    : undefined,
                  isWorstPlayer: player
                    ? player.playerId === lineupInsights?.worstPlayer?.playerId
                    : undefined,
                  isDarkHorse: player
                    ? player.playerId === lineupInsights?.darkHorse?.playerId
                    : undefined,
                };
              }),
            },
          ]}
          onSlotClick={(slot) => setActiveSlot(slot)}
          onViewPlayer={(slot) => {
            if (!slot.assignedPlayerId) return;
            setActivePlayerViewSlot({
              id: slot.id,
              playerId: slot.assignedPlayerId,
            });
          }}
          onRemovePlayer={(slot) => handleRemovePlayer(slot.id)}
        />

        {activeSlot && (
          <AddPlayerOverlay
            slotLabel={activeSlot.label}
            players={eligiblePlayers}
            onSelect={(player) => {
              setAssignments((prev) => ({ ...prev, [activeSlot.id]: player }));
              setActiveSlot(null);
            }}
            onClose={() => setActiveSlot(null)}
          />
        )}

        {activePlayerViewSlot && (
          <IndividualPlayerCardOverlay
            playerId={activePlayerViewSlot.playerId}
            leagueId={leagueId}
            isDarkHorse={
              activePlayerViewSlot.playerId ===
              lineupInsights?.darkHorse?.playerId
            }
            darkHorse={lineupInsights?.darkHorse}
            rosterId={rosterId}
            season={2025}
            onClose={() => setActivePlayerViewSlot(null)}
          />
        )}
      </div>

      {hasUnsavedChanges && (
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSaveLineup}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Lineup"}
          </button>
        </div>
      )}
    </>
  );
};

export default ViewLineupPanel;
