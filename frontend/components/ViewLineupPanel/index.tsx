"use client";

import LineupSlotsList from "../LineupSlotsList";
import type { PlayerStats } from "../LineupSlotsList";
import { FC, useEffect, useState } from "react";
import AddPlayerOverlay, { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";
import { ActiveSlot, getEligiblePlayers } from "@/lib/playerEligibility";
import { getStarterLabels, buildStarterAssignments, getBenchPlayers } from "@/lib/lineupSections";
import { computeStarterPointsTotal } from "@/lib/lineupTotals";
import styles from "./page.module.css";
import { useSearchParams } from "next/navigation";
import { fetchPlayerStatsByPlayerId, PROJECTION_BASE_SEASON } from "@/lib/playerStats";
import IndividualPlayerCardOverlay from "@/components/IndividualPlayerCardOverlay";
import BenchRow from "@/components/BenchRow";
import LineupInsightsPanel from "@/components/LineupInsightsPanel";
import { LineupInsights } from "@/types/PlayerTypes";
import { SLOT_ELIGIBILITY } from "@/constants";
import { API_BASE_URL } from "@/lib/api";

const NO_SCORE_POSITIONS = ["K", "DEF"];

function buildPlayerMeta(player: AddPlayerOverlayPlayer, stats?: PlayerStats): string {
  const team = player.team ?? "FA";
  if (NO_SCORE_POSITIONS.includes(player.position)) return `${team} · ${player.position} · no scoring data`;
  if (stats?.positionRank) return `${team} · ${player.position} · ${player.position}${stats.positionRank}`;
  return `${team} · ${player.position} · unranked`;
}

const ViewLineupPanel: FC = () => {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get("leagueId");
  const rosterId = searchParams.get("rosterId");

  const [players, setPlayers] = useState<AddPlayerOverlayPlayer[]>([]);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, AddPlayerOverlayPlayer>>({});
  const [benchPlayers, setBenchPlayers] = useState<AddPlayerOverlayPlayer[]>([]);
  const [starterLabels, setStarterLabels] = useState<string[]>([]);
  const [playerStatsByPlayerId, setPlayerStatsByPlayerId] = useState<Record<string, PlayerStats>>({});
  const [lineupInsights, setLineupInsights] = useState<LineupInsights | null>(null);
  const [lineupName, setLineupName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [swapFromPlayerId, setSwapFromPlayerId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const isSwapping = !!swapFromPlayerId;
  const swapFromPlayer = swapFromPlayerId
    ? (benchPlayers.find((player) => player.playerId === swapFromPlayerId) ?? null)
    : null;

  const benchPlayerIds = new Set(benchPlayers.map((player) => player.playerId));
  const eligiblePlayers = activeSlot
    ? getEligiblePlayers(
        players.filter((player) => !benchPlayerIds.has(player.playerId)),
        assignments,
        activeSlot,
      )
    : [];

  const loadLineup = async () => {
    if (!rosterId || !leagueId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/view-lineup?rosterId=${rosterId}&leagueId=${leagueId}`);
      const roster = await response.json();
      const labels = getStarterLabels(roster.league.rosterPositions);
      setStarterLabels(labels);
      setAssignments(buildStarterAssignments(labels, roster.rosterPlayers));
      setBenchPlayers(getBenchPlayers(roster.rosterPlayers));
      setLineupName(roster.name);
      setLeagueName(roster.league.name ?? "League");
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    Promise.resolve().then(loadLineup);
  }, [rosterId, leagueId]);

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
        const playerIds = [...Object.values(assignments), ...benchPlayers].map((player) => player.playerId);
        if (playerIds.length === 0) return;
        const data = await fetchPlayerStatsByPlayerId(playerIds, PROJECTION_BASE_SEASON, leagueId);
        setPlayerStatsByPlayerId(data);
      } catch (error) {
        console.error(error);
      }
    };
    loadPlayerStats();
  }, [assignments, benchPlayers, leagueId]);

  useEffect(() => {
    const loadInsights = async () => {
      if (!rosterId || !leagueId) return;
      try {
        const params = new URLSearchParams({ rosterId, leagueId, season: String(PROJECTION_BASE_SEASON) });
        const response = await fetch(`${API_BASE_URL}/lineup-insights?${params}`);
        if (!response.ok) throw new Error("Could not fetch lineup insights");
        const data = await response.json();
        setLineupInsights(data);
      } catch (error) {
        console.error(error);
      }
    };
    loadInsights();
  }, [assignments, benchPlayers, rosterId, leagueId]);

  const handleAddPlayer = async (player: AddPlayerOverlayPlayer) => {
    if (!activeSlot || !rosterId || !leagueId) return;
    setIsMutating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/add-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterId, leagueId, playerId: player.playerId, slot: activeSlot.label }),
      });
      if (!response.ok) throw new Error("Failed to add player");
      setActiveSlot(null);
      await loadLineup();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsMutating(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!rosterId || !leagueId) return;
    setIsMutating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/remove-player`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterId, leagueId, playerId }),
      });
      if (!response.ok) throw new Error("Failed to remove player");
      await loadLineup();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsMutating(false);
    }
  };

  const handleSwapComplete = async (targetPlayerId: string) => {
    if (!swapFromPlayerId || !rosterId || !leagueId) return;
    setIsMutating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/swap-players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterId, leagueId, playerAId: swapFromPlayerId, playerBId: targetPlayerId }),
      });
      if (!response.ok) throw new Error("Failed to swap players");
      setSwapFromPlayerId(null);
      await loadLineup();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsMutating(false);
    }
  };

  const starterSlots = starterLabels.map((label, index) => {
    const slotId = `starter-${index}`;
    const player = assignments[slotId];
    const isEligibleTarget =
      isSwapping &&
      !!player &&
      !!swapFromPlayer &&
      (SLOT_ELIGIBILITY[label]?.includes(swapFromPlayer.position) ?? true);
    return {
      id: slotId,
      label,
      assignedPlayerId: player?.playerId,
      assignedPlayerName: player?.fullName,
      assignedPlayerStats: player ? playerStatsByPlayerId[player.playerId] : undefined,
      meta: player ? buildPlayerMeta(player, playerStatsByPlayerId[player.playerId]) : undefined,
      isBestPlayer: player ? player.playerId === lineupInsights?.bestPlayer?.playerId : undefined,
      isWorstPlayer: player ? player.playerId === lineupInsights?.worstPlayer?.playerId : undefined,
      isDarkHorse: player ? player.playerId === lineupInsights?.darkHorse?.playerId : undefined,
      swapTarget: isEligibleTarget,
    };
  });

  const starterTotal = computeStarterPointsTotal(assignments, playerStatsByPlayerId);

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.header}>
          <div>
            <div className={styles.leagueLabel}>{leagueName}</div>
            <h2 className={styles.title}>{lineupName || "Untitled Lineup"}</h2>
          </div>
          <div className={styles.totalBlock}>
            <div className={styles.totalValue}>{starterTotal.toFixed(1)}</div>
            <div className={styles.totalLabel}>{PROJECTION_BASE_SEASON} SEASON TOTALS</div>
          </div>
        </div>

        {isSwapping && swapFromPlayer && (
          <div className={styles.swapBanner}>
            <span>Swapping {swapFromPlayer.fullName} — pick a starter to swap him with.</span>
            <button type="button" className={styles.cancelButton} onClick={() => setSwapFromPlayerId(null)}>
              Cancel
            </button>
          </div>
        )}

        <LineupSlotsList
          sections={[{ title: "Starters", slots: starterSlots }]}
          onSlotClick={isSwapping || isMutating ? undefined : (slot) => setActiveSlot(slot)}
          onViewPlayer={
            isSwapping || isMutating
              ? undefined
              : (slot) => slot.assignedPlayerId && setActivePlayerId(slot.assignedPlayerId)
          }
          onRemovePlayer={
            isSwapping || isMutating
              ? undefined
              : (slot) => slot.assignedPlayerId && handleRemovePlayer(slot.assignedPlayerId)
          }
          onSwapTarget={
            isSwapping ? (slot) => slot.assignedPlayerId && handleSwapComplete(slot.assignedPlayerId) : undefined
          }
        />

        <div className={styles.benchHeader}>BENCH</div>
        {benchPlayers.length > 0 ? (
          <div className={styles.benchGrid}>
            {benchPlayers.map((player) => (
              <BenchRow
                key={player.playerId}
                player={player}
                stats={playerStatsByPlayerId[player.playerId]}
                onView={() => setActivePlayerId(player.playerId)}
                onSwap={() => setSwapFromPlayerId(player.playerId)}
                onDrop={() => handleRemovePlayer(player.playerId)}
                disabled={isSwapping || isMutating}
              />
            ))}
          </div>
        ) : (
          <div className={styles.benchEmpty}>No players on the bench.</div>
        )}

        {activeSlot && (
          <AddPlayerOverlay
            slotLabel={activeSlot.label}
            players={eligiblePlayers}
            onSelect={handleAddPlayer}
            onClose={() => setActiveSlot(null)}
          />
        )}

        {activePlayerId && (
          <IndividualPlayerCardOverlay
            playerId={activePlayerId}
            leagueId={leagueId}
            season={PROJECTION_BASE_SEASON}
            onClose={() => setActivePlayerId(null)}
          />
        )}
      </div>

      <LineupInsightsPanel insights={lineupInsights} season={PROJECTION_BASE_SEASON} />
    </div>
  );
};

export default ViewLineupPanel;
