import { FC, useEffect, useState } from "react"
import type { LineupSlot as LineupSlotType } from "../LineupSlotsList";
import styles from './page.module.css'
import { PlayerStats } from "@/components/LineupSlotsList";

type IndividualPlayerCardOverlayProps = {
    playerId: string;
    leagueId: string | null;
    season: number;
    onClose: () => void;
}

const IndividualPlayerCardOverlay: FC<IndividualPlayerCardOverlayProps> = ({ playerId, leagueId, season, onClose }) => {

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
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/view-player?${params}`);
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
                        <header>
                        Player name: {playerStats?.fullName}
                        </header>
                        <div>
                        Position: {playerStats.position}
                        </div>
                        <div>
                        Team: {playerStats.team}
                        </div>
                        <div>
                        Games Played: {playerStats.gamesPlayed}
                        </div>
                        <div>
                        Position Rank: {playerStats.positionRank}
                        </div>
                        <div>
                        Season: {playerStats.season}
                        </div>
                        <div>
                        Total points previous season: {
                            playerStats.totalPoints.toFixed(1)
                        }
                        </div>
                    </>
                }
            </div>
        </div>
    )
}

export default IndividualPlayerCardOverlay;