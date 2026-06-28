'use client'

import LineupSlotsList from "../LineupSlotsList"
import { FC, useEffect, useState } from "react";
import AddPlayerOverlay, { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";
import { ActiveSlot, getEligiblePlayers } from "@/lib/playerEligibility";
import { splitRosterPositions, buildAssignments } from "@/lib/lineupSections";
import styles from './page.module.css'
import { useSearchParams } from "next/navigation";

const ViewLineupPanel: FC = () => {

    const searchParams = useSearchParams();
    const leagueId = searchParams.get("leagueId");
    const rosterId = searchParams.get("rosterId");

    const [players, setPlayers] = useState<AddPlayerOverlayPlayer[]>([]);
    const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
    const [assignments, setAssignments] = useState<Record<string, AddPlayerOverlayPlayer>>({});
    const [starterLabels, setStarterLabels] = useState<string[]>([]);
    const [benchLabels, setBenchLabels] = useState<string[]>([]);
    const eligiblePlayers = activeSlot ? getEligiblePlayers(players, assignments, activeSlot) : [];

    useEffect(() => {
        const loadLineup = async () => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/view-lineup?rosterId=${rosterId}&leagueId=${leagueId}`,
                );
                const roster = await response.json();
                const { starterLabels, benchLabels } = splitRosterPositions(roster.league.rosterPositions);
                setStarterLabels(starterLabels);
                setBenchLabels(benchLabels);
                setAssignments(buildAssignments(starterLabels, benchLabels, roster.rosterPlayers));
            } catch (error) {
                console.error(error);
            }
        }
        loadLineup();
    }, [rosterId, leagueId])

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

    return (
    <>
       <div className={styles.stack}>
            <LineupSlotsList
                sections={[
                {
                    title: "Starters",
                    slots: starterLabels.map((label, index) => ({
                    id: `starter-${index}`,
                    label,
                    assignedPlayerName: assignments[`starter-${index}`]?.fullName,
                    })),
                },
                {
                    title: "Bench",
                    slots: benchLabels.map((label, index) => ({
                    id: `bench-${index}`,
                    label,
                    assignedPlayerName: assignments[`bench-${index}`]?.fullName,
                    })),
                },
                ]}
                onSlotClick={(slot) => setActiveSlot(slot)}
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
        </div>
    </>
  );
}

export default ViewLineupPanel;