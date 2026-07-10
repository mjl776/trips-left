import { FC, useEffect, useState } from "react"
import type { LineupSlot as LineupSlotType } from "../LineupSlotsList";
import styles from './page.module.css'
import { PlayerStats } from "@/components/LineupSlotsList";
import { DarkHorsePlayer, LineupInsights } from "@/types/PlayerTypes";
import { formatOrdinal } from "@/lib/formatOrdinal";
import { API_BASE_URL } from "@/lib/api";

type IndividualPlayerCardOverlayProps = {
    playerId: string;
    leagueId: string | null;
    rosterId: string | null;
    season: number;
    isDarkHorse: boolean;
    darkHorse: DarkHorsePlayer | null | undefined;
    onClose: () => void;
}

const IndividualPlayerCardOverlay: FC<IndividualPlayerCardOverlayProps> = ({ playerId, leagueId, isDarkHorse, darkHorse, season, onClose }) => {

    const [playerStats, setPlayerStats] = useState<PlayerStats>();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const fetchViewPlayer = async () => {
            try {
                const params = new URLSearchParams({ playerId, season: String(season) });
                if (leagueId) params.set("leagueId", leagueId);
                const response = await fetch(`${API_BASE_URL}/view-player?${params}`);
                if (!response.ok) return null;
                const data = await response.json();
                setPlayerStats(data);
            } catch (error) {
                console.log(error);
            }
        }
        fetchViewPlayer();
    }, [playerId, leagueId, season])

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.playerCard}>
                {playerStats && <>
                        <header className={styles.playerName}>
                        {playerStats?.fullName}
                        </header>
                        <div className={styles.statList}>
                            <div className={styles.statRow}>
                            Position: {playerStats.position}
                            </div>
                            <div className={styles.statRow}>
                            Team: {playerStats.team}
                            </div>
                            <div className={styles.statRow}>
                            Games Played: {playerStats.gamesPlayed}
                            </div>
                            <div className={styles.statRow}>
                            Position Rank: {playerStats.positionRank}
                            </div>
                            <div className={styles.statRow}>
                            Season: {playerStats.season}
                            </div>
                            <div className={styles.statRow}>
                            Total points previous season: {
                                playerStats.totalPoints.toFixed(1)
                            }
                            </div>
                            {
                                isDarkHorse &&
                                <div className={styles.darkHorseNote}>
                                    This player ranks in the {darkHorse?.percentile != null ? formatOrdinal(darkHorse.percentile) : "—"} percentile in EPA for their position
                                    meaning they have great potential to break out or continue their stardom. {playerStats?.fullName} is ranked {darkHorse?.positionRank != null ? formatOrdinal(darkHorse.positionRank) : "—"} out of {darkHorse?.positionPlayerCount} players in this category.
                                </div>
                            }
                        </div>
                    </>
                }
            </div>
        </div>
    )
}

export default IndividualPlayerCardOverlay;