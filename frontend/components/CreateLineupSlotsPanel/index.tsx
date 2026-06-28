"use client";

import { FC, useEffect, useState } from "react";
import styles from "./page.module.css";
import AddPlayerOverlay from "../AddPlayerOverlay";
import type { AddPlayerOverlayPlayer } from "../AddPlayerOverlay";
import LineupSlotsList from "../LineupSlotsList";
import { saveLineup } from "@/lib/savedLineups";
import { getEligiblePlayers, type ActiveSlot } from "@/lib/playerEligibility";
import { useRouter } from "next/navigation";
import { BENCH_SLOTS, STARTER_SLOTS } from "@/constants";

type LineupSlotAssignment = {
  playerId: string;
  slot: string;
};

const CreateLineupSlotsPanel: FC = () => {
  const router = useRouter();

  const [players, setPlayers] = useState<AddPlayerOverlayPlayer[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AddPlayerOverlayPlayer>>({});
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/players`);
        const data = await response.json();
        setPlayers(data);
      } catch (error) {
        console.error(error);
      }
    };
    loadPlayers();
  }, []);

  const handleCreateLineup = async () => {
    setIsSubmitting(true);
    try {
      const leagueRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/create-mock-league`, {
        method: "POST",
      });
      if (!leagueRes.ok) {
        throw new Error("Failed to create mock league");
      }
      const league: { leagueId: string } = await leagueRes.json();

      const slotAssignments: LineupSlotAssignment[] = [
        ...STARTER_SLOTS.map((slot, index) => {
          const player = assignments[`starter-${index}`];
          return player ? { playerId: player.playerId, slot } : null;
        }),
        ...BENCH_SLOTS.map((slot, index) => {
          const player = assignments[`bench-${index}`];
          return player ? { playerId: player.playerId, slot } : null;
        }),
      ].filter((assignment): assignment is LineupSlotAssignment => assignment !== null);

      const lineupRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/create-lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: league.leagueId, name, assignments: slotAssignments }),
      });
      if (!lineupRes.ok) {
        throw new Error("Failed to create lineup");
      }
      const roster: { rosterId: string; leagueId: string; name: string } = await lineupRes.json();

      // Saves lineup in local storage object
      saveLineup({
        rosterId: roster.rosterId,
        leagueId: roster.leagueId,
        name: roster.name,
        createdAt: new Date().toISOString(),
      });

      alert("Lineup created!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      router.push('/lineup-management')
      setIsSubmitting(false);
    }
  };

  const eligiblePlayers = activeSlot ? getEligiblePlayers(players, assignments, activeSlot) : [];

  return (
    <>
      <div className={styles.stack}>
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
              slots: STARTER_SLOTS.map((label, index) => ({
                id: `starter-${index}`,
                label,
                assignedPlayerName: assignments[`starter-${index}`]?.fullName,
              })),
            },
            {
              title: "Bench",
              slots: BENCH_SLOTS.map((label, index) => ({
                id: `bench-${index}`,
                label,
                assignedPlayerName: assignments[`bench-${index}`]?.fullName,
              })),
            },
          ]}
          onSlotClick={(slot) => setActiveSlot(slot)}
        />
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.createButton}
          onClick={handleCreateLineup}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Lineup"}
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
    </>
  );
};

export default CreateLineupSlotsPanel;
