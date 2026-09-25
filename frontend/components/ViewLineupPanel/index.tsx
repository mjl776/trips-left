"use client";

import LineupSlotsList from "../LineupSlotsList";
import type { PlayerStats } from "../LineupSlotsList";
import { FC, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";
import { ActiveSlot, getEligiblePlayers } from "@/lib/playerEligibility";
import { getStarterLabels, buildStarterAssignments, getBenchLabels, buildBenchAssignments } from "@/lib/lineupSections";
import { computeStarterPointsTotal } from "@/lib/lineupTotals";
import styles from "./page.module.css";
import { useSearchParams } from "next/navigation";
import { PROJECTION_BASE_SEASON } from "@/lib/playerStats";
import BenchRow from "@/components/BenchRow";
import LineupInsightsPanel, { type InsightsStatus } from "@/components/LineupInsightsPanel";
import { RosterSkeleton } from "./ViewLineupSkeleton";
import { LineupInsights } from "@/types/PlayerTypes";
import { SLOT_ELIGIBILITY } from "@/constants";
import { API_BASE_URL } from "@/lib/api";

// Only rendered once a slot/card is actually opened — code-split out of the
// initial route bundle instead of shipping unconditionally.
const AddPlayerOverlay = dynamic(() => import("@/components/AddPlayerOverlay"));
const IndividualPlayerCardOverlay = dynamic(() => import("@/components/IndividualPlayerCardOverlay"));

const NO_SCORE_POSITIONS = ["K", "DEF"];

type LoadStatus = InsightsStatus;

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
  // Without both ids nothing is fetched, so start "ready" and show the empty state.
  const hasIds = !!rosterId && !!leagueId;
  const [lineupStatus, setLineupStatus] = useState<LoadStatus>(hasIds ? "loading" : "ready");
  const [insightsStatus, setInsightsStatus] = useState<LoadStatus>(hasIds ? "loading" : "ready");
  // Incremented per insights request; only the latest response may update state.
  const insightsRequestRef = useRef(0);

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
  //
  // Doesn't set "loading" itself: only the initial load (and a retry from the
  // error card) shows the skeleton. Reloads after a mutation keep the current
  // roster visible, with isMutating disabling interactions.
  const loadLineup = async () => {
    if (!rosterId || !leagueId) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/view-lineup?rosterId=${rosterId}&leagueId=${leagueId}&season=${PROJECTION_BASE_SEASON}`,
      );
      if (!response.ok) throw new Error("Could not fetch lineup");
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
      setLineupStatus("ready");
    } catch (error) {
      console.error(error);
      setLineupStatus("error");
    }
  };

  const retryLineup = () => {
    setLineupStatus("loading");
    loadLineup();
  };

  // Shows the insights skeleton on every call, including refreshes after a
  // mutation, and drops any response that a newer request has superseded.
  const loadInsights = async () => {
    if (!rosterId || !leagueId) return;
    const requestId = ++insightsRequestRef.current;
    setInsightsStatus("loading");
    try {
      const params = new URLSearchParams({ rosterId, leagueId, season: String(PROJECTION_BASE_SEASON) });
      const response = await fetch(`${API_BASE_URL}/lineup-insights?${params}`);
      if (!response.ok) throw new Error("Could not fetch lineup insights");
      const data = await response.json();
      if (requestId !== insightsRequestRef.current) return;
      setLineupInsights(data);
      setInsightsStatus("ready");
    } catch (error) {
      if (requestId !== insightsRequestRef.current) return;
      console.error(error);
      setInsightsStatus("error");
    }
  };

  // Both requests start together, but only the roster reload gates isMutating:
  // the roster stays interactive while (slower) insights recompute, and the
  // request counter in loadInsights drops any response a newer one superseded.
  const refreshAfterMutation = async () => {
    void loadInsights();
    await loadLineup();
  };

  // loadInsights doesn't depend on the roster, so both fire in parallel on mount.
  useEffect(() => {
    Promise.resolve().then(() => Promise.all([loadLineup(), loadInsights()]));
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
      await refreshAfterMutation();
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
      await refreshAfterMutation();
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
      await refreshAfterMutation();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsMutating(false);
    }
  };

  // Verdict badges only render from fresh insights; while a refresh is in
  // flight the previous verdicts may be wrong for the new roster.
  const verdicts = insightsStatus === "ready" ? lineupInsights : null;

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
      isBestPlayer: player ? player.playerId === verdicts?.bestPlayer?.playerId : undefined,
      isWorstPlayer: player ? player.playerId === verdicts?.worstPlayer?.playerId : undefined,
      isDarkHorse: player ? player.playerId === verdicts?.darkHorse?.playerId : undefined,
      swapTarget: isEligibleTarget,
    };
  });

  const starterTotal = computeStarterPointsTotal(assignments, playerStatsByPlayerId);

  const insightsPanel = (
    <LineupInsightsPanel
      insights={lineupInsights}
      season={PROJECTION_BASE_SEASON}
      status={insightsStatus}
      onRetry={loadInsights}
    />
  );

  if (lineupStatus === "loading") {
    return (
      <div className={styles.layout}>
        <div className={styles.main}>
          <RosterSkeleton />
        </div>
        {insightsPanel}
      </div>
    );
  }

  if (lineupStatus === "error") {
    return (
      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.errorCard} role="alert">
            <div className={styles.errorEyebrow}>LINEUP</div>
            <div className={styles.errorTitle}>Couldn&apos;t load this lineup.</div>
            <div className={styles.errorBody}>
              The roster request didn&apos;t come back. Your lineup is saved — retrying usually fixes it.
            </div>
            <button type="button" className={styles.retryButton} onClick={retryLineup}>
              Retry
            </button>
          </div>
        </div>
        {insightsPanel}
      </div>
    );
  }

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

      {insightsPanel}
    </div>
  );
};

export default ViewLineupPanel;
