"use client";

import { FC, useEffect, useState } from "react";
import styles from "./page.module.css";
import AddPlayerOverlay from "../AddPlayerOverlay";
import type { AddPlayerOverlayPlayer } from "../AddPlayerOverlay";
import LineupSlotsList from "../LineupSlotsList";
import type { PlayerStats } from "../LineupSlotsList";
import { saveLineup } from "@/lib/savedLineups";
import { getEligiblePlayers, type ActiveSlot } from "@/lib/playerEligibility";
import { useRouter } from "next/navigation";
import { STARTER_SLOTS } from "@/constants";
import { API_BASE_URL } from "@/lib/api";
import { fetchPlayerStatsByPlayerId, PROJECTION_BASE_SEASON } from "@/lib/playerStats";
import type { League } from "@/types/LeagueTypes";

type LineupSlotAssignment = {
  playerId: string;
  slot: string;
};

type CreateLineupSlotsPanelProps = {
  league: League;
  onChangeLeague: () => void;
};

const CreateLineupSlotsPanel: FC<CreateLineupSlotsPanelProps> = ({ league, onChangeLeague }) => {
  const router = useRouter();

  const [players, setPlayers] = useState<AddPlayerOverlayPlayer[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AddPlayerOverlayPlayer>>({});
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [playerStatsByPlayerId, setPlayerStatsByPlayerId] = useState<Record<string, PlayerStats>>({});

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/players`);
        const data = await response.json();
        setPlayers(data);
      } catch (error) {
        console.error(error);
      }
    };
    loadPlayers();
  }, []);

  useEffect(() => {
    const loadPlayerStats = async () => {
      try {
        const playerIds = Object.values(assignments).map((player) => player.playerId);
        if (playerIds.length === 0) return;
        const data = await fetchPlayerStatsByPlayerId(playerIds, PROJECTION_BASE_SEASON);
        setPlayerStatsByPlayerId(data);
      } catch (error) {
        console.error(error);
      }
    };
    loadPlayerStats();
  }, [assignments]);

  const filledCount = STARTER_SLOTS.filter((_, index) => assignments[`starter-${index}`]).length;
  const canCreate = filledCount === STARTER_SLOTS.length;

  const handleCreateLineup = async () => {
    if (!canCreate) return;
    setIsSubmitting(true);
    try {
      const slotAssignments: LineupSlotAssignment[] = STARTER_SLOTS.map((slot, index) => {
        const player = assignments[`starter-${index}`];
        return player ? { playerId: player.playerId, slot } : null;
      }).filter((assignment): assignment is LineupSlotAssignment => assignment !== null);

      const lineupRes = await fetch(`${API_BASE_URL}/create-lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: league.leagueId, name, assignments: slotAssignments }),
      });
      if (!lineupRes.ok) {
        throw new Error("Failed to create lineup");
      }
      const roster: { rosterId: string; leagueId: string; name: string } = await lineupRes.json();

      saveLineup({
        rosterId: roster.rosterId,
        leagueId: roster.leagueId,
        name: roster.name,
        isMock: league.isMock,
        createdAt: new Date().toISOString(),
      });

      alert("Lineup created!");
      router.push("/lineup-management");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePlayer = (slotId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const eligiblePlayers = activeSlot ? getEligiblePlayers(players, assignments, activeSlot) : [];

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name your lineup"
          className={styles.nameInput}
        />

        <LineupSlotsList
          sections={[
            {
              title: "Starters",
              slots: STARTER_SLOTS.map((label, index) => {
                const player = assignments[`starter-${index}`];
                return {
                  id: `starter-${index}`,
                  label,
                  assignedPlayerName: player?.fullName,
                  assignedPlayerStats: player ? playerStatsByPlayerId[player.playerId] : undefined,
                };
              }),
            },
          ]}
          onSlotClick={(slot) => setActiveSlot(slot)}
          onRemovePlayer={(slot) => handleRemovePlayer(slot.id)}
        />
      </div>

      <div className={styles.sidebar}>
        <div className={styles.microLabel}>LEAGUE ATTACHED</div>
        <div className={styles.leagueName}>{league.name || "Untitled league"}</div>
        <div className={styles.leagueRows}>
          <div className={styles.leagueRow}>
            <span className={styles.leagueRowLabel}>SOURCE</span>
            <span className={styles.leagueRowValue}>{league.isMock ? "Mock" : "Sleeper import"}</span>
          </div>
          <div className={styles.leagueRow}>
            <span className={styles.leagueRowLabel}>LEAGUE ID</span>
            <span className={styles.leagueRowValue}>{league.leagueId.slice(0, 14)}</span>
          </div>
          <div className={styles.leagueRow}>
            <span className={styles.leagueRowLabel}>SEASON</span>
            <span className={styles.leagueRowValue}>{league.season}</span>
          </div>
          <div className={styles.leagueRow}>
            <span className={styles.leagueRowLabel}>TEAMS</span>
            <span className={styles.leagueRowValue}>{league.numTeams ?? "—"}</span>
          </div>
          <div className={styles.leagueRow}>
            <span className={styles.leagueRowLabel}>SCORING</span>
            <span className={styles.leagueRowValue}>{league.isMock ? "Sleeper default" : "From league"}</span>
          </div>
          <div className={styles.leagueRow}>
            <span className={styles.leagueRowLabel}>STARTERS</span>
            <span className={styles.leagueRowValue}>{STARTER_SLOTS.length} + 10 BN</span>
          </div>
        </div>
        <p className={styles.leagueHint}>
          {league.isMock
            ? "Mock league scoring is fixed at creation — it can't be edited afterwards."
            : "Imported settings stay in sync with Sleeper and are read-only here."}
        </p>
        <button
          type="button"
          className={styles.createButton}
          onClick={handleCreateLineup}
          disabled={!canCreate || isSubmitting}
        >
          {isSubmitting
            ? "Creating..."
            : canCreate
              ? "Create lineup"
              : `${filledCount} of ${STARTER_SLOTS.length} slots filled`}
        </button>
        <button type="button" className={styles.changeLeagueButton} onClick={onChangeLeague}>
          Change league
        </button>
      </div>

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
    </div>
  );
};

export default CreateLineupSlotsPanel;
