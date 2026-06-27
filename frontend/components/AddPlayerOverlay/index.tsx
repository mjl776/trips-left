"use client";

import { FC, useEffect, useState } from "react";
import styles from "./page.module.css";

export type AddPlayerOverlayPlayer = {
  playerId: string;
  fullName: string;
  position: string;
  team: string | null;
};

type AddPlayerOverlayProps = {
  slotLabel: string;
  players: AddPlayerOverlayPlayer[];
  onSelect: (player: AddPlayerOverlayPlayer) => void;
  onClose: () => void;
};

const MAX_RESULTS = 25;

const AddPlayerOverlay: FC<AddPlayerOverlayProps> = ({ slotLabel, players, onSelect, onClose }) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const trimmedQuery = query.trim().toLowerCase();
  const matches = trimmedQuery
    ? players.filter((player) => player.fullName.toLowerCase().includes(trimmedQuery))
    : [];
  const results = matches.slice(0, MAX_RESULTS);
  
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.card} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Add {slotLabel}</span>
          <button type="button" className={styles.closeButton} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <input
          type="text"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search players..."
          className={styles.searchInput}
        />

        <div className={styles.results}>
          {trimmedQuery === "" ? (
            <div className={styles.empty}>Search players</div>
          ) : results.length === 0 ? (
            <div className={styles.empty}>No players found</div>
          ) : (
            <>
              {results.map((player) => (
                <button
                  key={player.playerId}
                  type="button"
                  className={styles.resultRow}
                  onClick={() => onSelect(player)}
                >
                  <span className={styles.resultPosition}>{player.position}</span>
                  <div className={styles.resultInfo}>
                    <span className={styles.resultName}>{player.fullName}</span>
                    {player.team && <span className={styles.resultTeam}>{player.team}</span>}
                  </div>
                </button>
              ))}
              {matches.length > MAX_RESULTS && (
                <div className={styles.truncated}>
                  Showing first {MAX_RESULTS} of {matches.length} matches
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPlayerOverlay;
