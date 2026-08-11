"use client";

import { FC, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import AddPlayerOverlay, { AddPlayerOverlayPlayer } from "@/components/AddPlayerOverlay";
import { API_BASE_URL } from "@/lib/api";
import { PROJECTION_BASE_SEASON } from "@/lib/playerStats";
import type { SimulateTradeResponse, TradePlayer } from "@/types/TradeTypes";

type FetchState = "idle" | "loading" | "error" | "success";
type Side = "out" | "in";

function fmtSigned(value: number, digits = 1): string {
  const rounded = Math.abs(value).toFixed(digits);
  return `${value < 0 ? "-" : "+"}${rounded}`;
}

const TradeSimulator: FC = () => {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get("leagueId");

  const [players, setPlayers] = useState<AddPlayerOverlayPlayer[]>([]);
  const [playerOut, setPlayerOut] = useState<AddPlayerOverlayPlayer | null>(null);
  const [playerIn, setPlayerIn] = useState<AddPlayerOverlayPlayer | null>(null);
  const [activeSide, setActiveSide] = useState<Side | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [result, setResult] = useState<SimulateTradeResponse | null>(null);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/players`);
        if (!response.ok) return;
        const data = await response.json();
        setPlayers(data);
      } catch (error) {
        console.error(error);
      }
    };
    loadPlayers();
  }, []);

  useEffect(() => {
    if (!playerOut || !playerIn) return;

    let cancelled = false;
    const simulateTrade = async () => {
      setFetchState("loading");
      try {
        const response = await fetch(`${API_BASE_URL}/simulate-trade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(leagueId ? { leagueId } : {}),
            season: PROJECTION_BASE_SEASON,
            playerOutId: playerOut.playerId,
            playerInId: playerIn.playerId,
          }),
        });
        if (!response.ok) throw new Error("Failed to simulate trade");
        const data: SimulateTradeResponse = await response.json();
        if (!cancelled) {
          setResult(data);
          setFetchState("success");
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setResult(null);
          setFetchState("error");
        }
      }
    };
    simulateTrade();

    return () => {
      cancelled = true;
    };
  }, [playerOut, playerIn, leagueId]);

  const handleSelect = (player: AddPlayerOverlayPlayer) => {
    if (activeSide === "out") setPlayerOut(player);
    else if (activeSide === "in") setPlayerIn(player);
    setActiveSide(null);
    setResult(null);
    setFetchState("idle");
  };

  const clearSide = (side: Side) => {
    if (side === "out") setPlayerOut(null);
    else setPlayerIn(null);
    setResult(null);
    setFetchState("idle");
  };

  const renderSlot = (
    side: Side,
    chipLabel: string,
    helper: string,
    player: AddPlayerOverlayPlayer | null,
    resultPlayer: TradePlayer | undefined,
  ) => (
    <div className={styles.slotCard}>
      <div className={styles.slotHeader}>
        <span className={styles.chip}>{chipLabel}</span>
        <span className={styles.helperText}>{helper}</span>
      </div>

      {!player ? (
        <button type="button" className={styles.emptySlot} onClick={() => setActiveSide(side)}>
          <span className={styles.addButton} aria-hidden="true">
            +
          </span>
          <span className={styles.addLabel}>Add a player {side === "out" ? "to give up" : "to receive"}</span>
        </button>
      ) : (
        <div className={styles.filledSlot}>
          <div className={styles.playerRow}>
            <span className={styles.positionBadge}>{player.position}</span>
            <div className={styles.playerInfo}>
              <span className={styles.playerName}>{player.fullName}</span>
              <span className={styles.playerMeta}>
                {player.team ?? "FA"} · {player.position}
              </span>
            </div>
          </div>
          {resultPlayer && resultPlayer.weeksPlayed === 0 && (
            <div className={styles.noDataNote}>Not enough data this season — no games recorded.</div>
          )}
          <div className={styles.slotActions}>
            <button type="button" className={styles.changeButton} onClick={() => setActiveSide(side)}>
              Change
            </button>
            <button
              type="button"
              className={styles.removeButton}
              aria-label="Remove player"
              onClick={() => clearSide(side)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderComparisonRow = (
    label: string,
    formatValue: (player: TradePlayer) => string,
    getRaw: (player: TradePlayer) => number | null,
  ) => {
    if (!result) return null;
    const outRaw = getRaw(result.playerOut);
    const inRaw = getRaw(result.playerIn);
    const outWins = outRaw !== null && inRaw !== null && outRaw > inRaw;
    const inWins = outRaw !== null && inRaw !== null && inRaw > outRaw;
    return (
      <div className={styles.comparisonRow}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={outWins ? styles.rowValueWinner : styles.rowValue}>{formatValue(result.playerOut)}</span>
        <span className={inWins ? styles.rowValueWinner : styles.rowValue}>{formatValue(result.playerIn)}</span>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.microLabel}>TRADE SIMULATOR</div>
      <h2 className={styles.heading}>Simulate a trade</h2>
      <p className={styles.subtitle}>
        Pick one player to give up and one to receive. Value, efficiency, and ROI are scored against each player&apos;s
        real {PROJECTION_BASE_SEASON} production.
      </p>

      <div className={styles.slotsGrid}>
        {renderSlot("out", "GIVE UP", "Player you give up", playerOut, result?.playerOut)}
        {renderSlot("in", "RECEIVE", "Player you receive", playerIn, result?.playerIn)}
      </div>

      {fetchState === "loading" && <div className={styles.statusNote}>Simulating trade…</div>}
      {fetchState === "error" && (
        <div className={styles.errorBanner}>Something went wrong evaluating this trade. Try again.</div>
      )}
      {fetchState === "idle" && (playerOut || playerIn) && !(playerOut && playerIn) && (
        <div className={styles.statusNote}>Select a player on both sides to run the simulation.</div>
      )}

      {fetchState === "success" && result && (
        <div className={styles.results}>
          <div className={styles.comparisonSection}>
            <div className={styles.comparisonLabel}>VALUE COMPARISON</div>
            <div className={styles.comparisonHeaderRow}>
              <span />
              <span className={styles.columnLabel}>GIVE UP</span>
              <span className={styles.columnLabel}>RECEIVE</span>
            </div>
            <div className={styles.comparisonTable}>
              {renderComparisonRow(
                `VALUE (${PROJECTION_BASE_SEASON})`,
                (p) => p.value.toFixed(1),
                (p) => p.value,
              )}
              {renderComparisonRow(
                "PTS / OPPORTUNITY",
                (p) => (p.efficiency === null ? "—" : p.efficiency.toFixed(2)),
                (p) => p.efficiency,
              )}
            </div>
          </div>

          <div className={styles.roiCard}>
            <div className={styles.roiLabel}>RETURN ON VALUE GIVEN UP</div>
            <div className={result.roi === null ? styles.roiValue : result.roi >= 0 ? styles.roiValuePositive : styles.roiValueNegative}>
              {result.roi === null ? "—" : `${fmtSigned(result.roi, 1)}%`}
            </div>
            <div className={styles.roiNote}>
              {result.roi === null
                ? `No ${PROJECTION_BASE_SEASON} production recorded for ${result.playerOut.fullName} — ROI can't be computed against zero value.`
                : `Trading ${result.playerOut.fullName} for ${result.playerIn.fullName} returns ${fmtSigned(
                    result.roi,
                    1,
                  )}% on the value given up, based on ${PROJECTION_BASE_SEASON} production.`}
            </div>
          </div>

          <div className={styles.simCard}>
            <div className={styles.simHeader}>TRADE EXPECTATION · MONTE CARLO</div>
            {result.simulation ? (
              <>
                <div className={styles.simStatsRow}>
                  <div className={styles.deltaBlock}>
                    <div className={result.simulation.expectedDelta >= 0 ? styles.deltaValuePositive : styles.deltaValueNegative}>
                      {fmtSigned(result.simulation.expectedDelta, 1)} pts
                    </div>
                    <div className={styles.deltaCaption}>EXPECTED POINT SWING</div>
                  </div>
                  <div className={styles.winProbBlock}>
                    <div className={styles.winProbHeader}>
                      <span>Win probability</span>
                      <span className={styles.winProbValue}>{result.simulation.winProbability.toFixed(0)}%</span>
                    </div>
                    <div className={styles.winProbBar}>
                      <div
                        className={styles.winProbBarFill}
                        style={{ width: `${Math.max(0, Math.min(100, result.simulation.winProbability))}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.percentileRow}>
                  <div className={styles.percentileTile}>
                    <div className={styles.percentileLabel}>P10</div>
                    <div className={styles.percentileValue}>{fmtSigned(result.simulation.percentiles.p10, 1)}</div>
                  </div>
                  <div className={styles.percentileTile}>
                    <div className={styles.percentileLabel}>MEDIAN (P50)</div>
                    <div className={styles.percentileValue}>{fmtSigned(result.simulation.percentiles.p50, 1)}</div>
                  </div>
                  <div className={styles.percentileTile}>
                    <div className={styles.percentileLabel}>P90</div>
                    <div className={styles.percentileValue}>{fmtSigned(result.simulation.percentiles.p90, 1)}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.simUnavailableNotice}>
                Trade expectation simulation is temporarily unavailable. Value, efficiency, and ROI above are
                unaffected.
              </div>
            )}
          </div>
        </div>
      )}

      {activeSide && (
        <AddPlayerOverlay
          slotLabel={activeSide === "out" ? "player to give up" : "player to receive"}
          players={players}
          onSelect={handleSelect}
          onClose={() => setActiveSide(null)}
        />
      )}
    </div>
  );
};

export default TradeSimulator;
