"use client";

import { FC, useEffect, useState } from "react"
import styles from './page.module.css'
import type { PlayerStats } from "@/components/LineupSlotsList";
import type { PlayerStatRank } from "@/types/PlayerTypes";
import { API_BASE_URL } from "@/lib/api";
import { POSITION_RANKABLE_STATS, RANKABLE_STAT_LABELS } from "@/constants";

type IndividualPlayerCardOverlayProps = {
    playerId: string;
    leagueId: string | null;
    season: number;
    onClose: () => void;
    // When the caller already has this player's season stats (e.g. a rostered
    // player on the view-lineup page), skip the redundant GET /view-player.
    initialStats?: PlayerStats;
}

// Raw units per RANKABLE_STAT from the backend — spot-check against real data once wired up.
function formatStatValue(stat: string, value: number): string {
    switch (stat) {
        case "passingAirYards":
        case "receivingAirYards":
            return Math.round(value).toLocaleString();
        case "targetShare":
            return `${(value * 100).toFixed(1)}%`;
        case "passingCpoe":
            return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
        case "wopr":
            return value.toFixed(2);
        default:
            return String(value);
    }
}

const IndividualPlayerCardOverlay: FC<IndividualPlayerCardOverlayProps> = ({ playerId, leagueId, season, onClose, initialStats }) => {

    const [playerStats, setPlayerStats] = useState<PlayerStats | undefined>(initialStats);
    const [statRanks, setStatRanks] = useState<PlayerStatRank[]>([]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (initialStats) return;
        const fetchViewPlayer = async () => {
            try {
                const params = new URLSearchParams({ playerId, season: String(season) });
                if (leagueId) params.set("leagueId", leagueId);
                const response = await fetch(`${API_BASE_URL}/view-player?${params}`);
                if (!response.ok) return;
                const data = await response.json();
                setPlayerStats(data);
            } catch (error) {
                console.error(error);
            }
        }
        fetchViewPlayer();
    }, [playerId, leagueId, season, initialStats])

    useEffect(() => {
        if (!playerStats) return;
        const stats = POSITION_RANKABLE_STATS[playerStats.position] ?? [];
        if (stats.length === 0) {
            Promise.resolve().then(() => setStatRanks([]));
            return;
        }

        const fetchRanks = async () => {
            try {
                const results = await Promise.all(
                    stats.map(async (stat) => {
                        const params = new URLSearchParams({ playerId, season: String(season), stat });
                        const response = await fetch(`${API_BASE_URL}/player-stat-rank?${params}`);
                        if (!response.ok) return null;
                        return (await response.json()) as PlayerStatRank;
                    }),
                );
                setStatRanks(results.filter((rank): rank is PlayerStatRank => rank !== null && rank.value !== null));
            } catch (error) {
                console.error(error);
            }
        };
        fetchRanks();
    }, [playerStats, playerId, season]);

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.playerCard} onClick={(event) => event.stopPropagation()}>
                {playerStats && <>
                    <div className={styles.header}>
                        <div>
                            <header className={styles.playerName}>{playerStats.fullName}</header>
                            <div className={styles.playerMeta}>
                                {playerStats.team ?? "Free agent"} · {playerStats.position} · {playerStats.season} season
                            </div>
                        </div>
                        <button type="button" className={styles.closeButton} aria-label="Close" onClick={onClose}>×</button>
                    </div>

                    <div className={styles.tileRow}>
                        <div className={styles.tile}>
                            <div className={styles.tileLabel}>FANTASY PTS</div>
                            <div className={styles.tileValue}>{playerStats.totalPoints.toFixed(1)}</div>
                        </div>
                        <div className={styles.tile}>
                            <div className={styles.tileLabel}>GAMES</div>
                            <div className={styles.tileValue}>{playerStats.gamesPlayed ?? "—"}</div>
                        </div>
                        <div className={styles.tile}>
                            <div className={styles.tileLabel}>POS RANK</div>
                            <div className={styles.tileValue}>
                                {playerStats.positionRank ? `#${playerStats.positionRank}/${playerStats.positionPlayerCount}` : "—"}
                            </div>
                        </div>
                    </div>

                    <div className={styles.sectionHeader}>ADVANCED METRIC RANKS</div>
                    {statRanks.length > 0 ? (
                        <div className={styles.statList}>
                            {statRanks.map((rank) => {
                                const pct = rank.positionRank && rank.positionPlayerCount
                                    ? Math.round(((rank.positionPlayerCount - rank.positionRank + 1) / rank.positionPlayerCount) * 100)
                                    : 0;
                                const isTopTier = !!rank.positionRank && rank.positionRank <= 12;
                                return (
                                    <div key={rank.stat} className={styles.statRow}>
                                        <div className={styles.statHeaderRow}>
                                            <span className={styles.statLabel}>{RANKABLE_STAT_LABELS[rank.stat] ?? rank.stat}</span>
                                            <span className={isTopTier ? styles.statRankTop : styles.statRank}>
                                                {rank.positionRank ? `#${rank.positionRank} of ${rank.positionPlayerCount}` : "—"}
                                            </span>
                                        </div>
                                        <div className={styles.barTrack}>
                                            <div className={styles.barFill} style={{ width: `${pct}%` }} />
                                        </div>
                                        {rank.value !== null && (
                                            <div className={styles.statValue}>
                                                {formatStatValue(rank.stat, rank.value)} · {pct}th percentile
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.emptyStats}>
                            {playerStats.position === "K" || playerStats.position === "DEF"
                                ? `No advanced metrics are ranked for ${playerStats.position}s — the stats table has no field-goal or points-allowed columns yet, so kickers and defenses have no rankable production.`
                                : "No advanced metrics available for this player yet."}
                        </div>
                    )}
                </>}
            </div>
        </div>
    )
}

export default IndividualPlayerCardOverlay;
