"use client";

import { FC, useEffect, useState } from "react";
import styles from "./page.module.css";
import type { AddPlayerOverlayPlayer } from "../AddPlayerOverlay";

// Mirrors the default mock-league rosterPositions in backend/src/league/league.service.ts
const STARTER_SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF"];
const BENCH_SLOTS = Array.from({ length: 10 }, () => "BN");

const LineupSlotsPanel: FC = () => {
  const [players, setPlayers] = useState<AddPlayerOverlayPlayer[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/players`)
      .then((res) => res.json())
      .then(setPlayers);
  }, [])

  return (
    <div className={styles.panel}>
      {STARTER_SLOTS.map((slot, index) => (
        <div key={`starter-${index}`} className={styles.slot}>
          <span className={styles.position}>{slot}</span>
          <span className={styles.placeholder}>Empty</span>
          <button type="button" className={styles.addCircle} aria-label={`Add player to ${slot}`}>
            <span className={styles.plus}>+</span>
          </button>
        </div>
      ))}

      <div className={styles.divider}>Bench</div>

      {BENCH_SLOTS.map((slot, index) => (
        <div key={`bench-${index}`} className={styles.slot}>
          <span className={styles.position}>{slot}</span>
          <span className={styles.placeholder}>Empty</span>
        </div>
      ))}
    </div>
  );
};

export default LineupSlotsPanel;
