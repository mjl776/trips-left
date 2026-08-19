"use client";

import LineupSlotsList from "../LineupSlotsList";
import type { PlayerStats } from "../LineupSlotsList";
import { FC, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";
import { ActiveSlot, getEligiblePlayers } from "@/lib/playerEligibility";
import { getStarterLabels, buildStarterAssignments, getBenchLabels, buildBenchAssignments } from "@/lib/lineupSections";
import { computeStarterPointsTotal } from "@/lib/lineupTotals";
import styles from "./page.module.css";
import { useSearchParams } from "next/navigation";
import { PROJECTION_BASE_SEASON } from "@/lib/playerStats";
import BenchRow from "@/components/BenchRow";
import LineupInsightsPanel from "@/components/LineupInsightsPanel";
import { LineupInsights } from "@/types/PlayerTypes";
import { SLOT_ELIGIBILITY } from "@/constants";
import { API_BASE_URL } from "@/lib/api";

// Only rendered once a slot/card is actually opened — code-split out of the
// initial route bundle instead of shipping unconditionally.
const AddPlayerOverlay = dynamic(() => import("@/components/AddPlayerOverlay"));
const IndividualPlayerCardOverlay = dynamic(() => import("@/components/IndividualPlayerCardOverlay"));

const NO_SCORE_POSITIONS = ["K", "DEF"];

type RosterPlayerWithStats = {
  player: { playerId: string };
  stats?: PlayerStats;
};

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
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, AddPlayerOverlayPlayer>>({});
  const [benchLabels, setBenchLabels] = useState<string[]>([]);
  const [benchAssignments, setBenchAssignments] = useState<Record<string, AddPlayerOverlayPlayer>>({});
  const [starterLabels, setStarterLabels] = useState<string[]>([]);
  const [playerStatsByPlayerId, setPlayerStatsByPlayerId] = useState<Record<string, PlayerStats>>({});
  const [lineupInsights, setLineupInsights] = useState<LineupInsights | null>(null);
  const [lineupName, setLineupName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [swapFromPlayerId, setSwapFromPlayerId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const isSwapping = !!swapFromPlayerId;
  const swapFromPlayer = swapFromPlayerId
    ? (Object.values(benchAssignments).find((player) => player.playerId === swapFromPlayerId) ?? null)
    : null;

  const allAssignments = { ...assignments, ...benchAssignments };
  const eligiblePlayers = activeSlot ? getEligiblePlayers(players, allAssignments, activeSlot) : [];

  // view-lineup embeds each rostered player's season stats server-side (when
  // `season` is passed) — this replaces what used to be a separate
  // fetchPlayerStatsByPlayerId fan-out of one GET /view-player per rostered
  // player.
  const loadLineup = async () => {
    if (!rosterId || !leagueId) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/view-lineup?rosterId=${rosterId}&leagueId=${leagueId}&season=${PROJECTION_BASE_SEASON}`,
      );
      const roster = await response.json();
      const labels = getStarterLabels(roster.league.rosterPositions);
      setStarterLabels(labels);
      setAssignments(buildStarterAssignments(labels, roster.rosterPlayers));
      const benchLabelList = getBenchLabels(roster.league.rosterPositions);
      setBenchLabels(benchLabelList);
      setBenchAssignments(buildBenchAssignments(benchLabelList, roster.rosterPlayers));
      setLineupName(roster.name);
      setLeagueName(roster.league.name ?? "League");
      setPlayerStatsByPlayerId(
        Object.fromEntries(
          (roster.rosterPlayers as RosterPlayerWithStats[])
            .filter((rp) => rp.stats)
            .map((rp) => [rp.player.playerId, rp.stats as PlayerStats]),
        ),
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    Promise.resolve().then(loadLineup);
  }, [rosterId, leagueId]);

  // Deferred until a slot is actually opened — GET /players returns the
  // entire player list and is only needed for the add-player search.
  useEffect(() => {
    if (!activeSlot || playersLoaded) return;
    const loadPlayers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/players`);
        const data = await response.json();
        setPlayers(data);
        setPlayersLoaded(true);
      } catch (error) {
        console.error(error);
      }
    };
    loadPlayers();
  }, [activeSlot, playersLoaded]);

  // Only depends on rosterId/leagueId (the body never reads assignments/
  // benchAssignments), so it fires in parallel with loadLineup on mount
  // instead of waiting for the roster to load first.
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
  }, [rosterId, leagueId]);

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
        {benchLabels.length > 0 ? (
          <div className={styles.benchGrid}>
            {benchLabels.map((_, index) => {
              const slotId = `bench-${index}`;
              const player = benchAssignments[slotId] ?? null;
              return (
                <BenchRow
                  key={slotId}
                  player={player}
                  stats={player ? playerStatsByPlayerId[player.playerId] : undefined}
                  onView={player ? () => setActivePlayerId(player.playerId) : undefined}
                  onSwap={player ? () => setSwapFromPlayerId(player.playerId) : undefined}
                  onDrop={player ? () => handleRemovePlayer(player.playerId) : undefined}
                  onAdd={!player ? () => setActiveSlot({ id: slotId, label: "BN" }) : undefined}
                  disabled={isSwapping || isMutating}
                />
              );
            })}
          </div>
        ) : (
          <div className={styles.benchEmpty}>No players on the bench.</div>
        )}

        {activeSlot && (
          <AddPlayerOverlay
            slotLabel={activeSlot.label === "BN" ? "Bench" : activeSlot.label}
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
            initialStats={playerStatsByPlayerId[activePlayerId]}
            onClose={() => setActivePlayerId(null)}
          />
        )}
      </div>

      <LineupInsightsPanel insights={lineupInsights} season={PROJECTION_BASE_SEASON} />
    </div>
  );
};

export default ViewLineupPanel;
