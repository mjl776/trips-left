"use client";

import LineupSlotsList from "../LineupSlotsList";
import type { PlayerStats } from "../LineupSlotsList";
import { FC, useEffect, useState } from "react";
import AddPlayerOverlay, {
  AddPlayerOverlayPlayer,
} from "@/components/AddPlayerOverlay";
import { ActiveSlot, getEligiblePlayers } from "@/lib/playerEligibility";
import { splitRosterPositions, buildAssignments } from "@/lib/lineupSections";
import styles from "./page.module.css";
import { useSearchParams } from "next/navigation";
import {
  fetchPlayerStatsByPlayerId,
  PROJECTION_BASE_SEASON,
} from "@/lib/playerStats";
import IndividualPlayerCardOverlay from "@/components/IndividualPlayerCardOverlay";
import { LineupInsights } from "@/types/PlayerTypes";

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

  const eligiblePlayers = activeSlot
    ? getEligiblePlayers(players, assignments, activeSlot)
    : [];

  useEffect(() => {
    const loadLineup = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/view-lineup?rosterId=${rosterId}&leagueId=${leagueId}`,
        );
        const roster = await response.json();
        const { starterLabels, benchLabels } = splitRosterPositions(
          roster.league.rosterPositions,
        );
        setStarterLabels(starterLabels);
        setBenchLabels(benchLabels);
        setAssignments(
          buildAssignments(starterLabels, benchLabels, roster.rosterPlayers),
        );
      } catch (error) {
        console.error(error);
      }
    };
    loadLineup();
  }, [rosterId, leagueId]);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/players`,
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
          `${process.env.NEXT_PUBLIC_API_URL}/lineup-insights?${params}`,
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
    </>
  );
};

export default ViewLineupPanel;
