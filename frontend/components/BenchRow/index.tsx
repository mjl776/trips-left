"use client";

import { FC } from "react";
import styles from "./page.module.css";
import type { AddPlayerOverlayPlayer } from "../AddPlayerOverlay";
import type { PlayerStats } from "../LineupSlotsList";
import ProjectPointsBox from "../ProjectedPointsBox";

type BenchRowProps = {
  player: AddPlayerOverlayPlayer;
  stats?: PlayerStats;
  onView: () => void;
  onSwap: () => void;
  onDrop: () => void;
  disabled?: boolean;
};

const BenchRow: FC<BenchRowProps> = ({ player, stats, onView, onSwap, onDrop, disabled }) => {
  return (
    <div className={styles.row}>
      <span className={styles.position}>{player.position}</span>
      <button type="button" className={styles.info} onClick={onView} disabled={disabled}>
        <span className={styles.name}>{player.fullName}</span>
        <span className={styles.meta}>{player.team ?? "FA"}</span>
      </button>
      <span className={styles.trailing}>
        <ProjectPointsBox stats={stats} />
        <button type="button" className={styles.swapButton} onClick={onSwap} disabled={disabled}>
          SWAP
        </button>
        <button type="button" className={styles.dropButton} onClick={onDrop} disabled={disabled}>
          DROP
        </button>
      </span>
    </div>
  );
};

export default BenchRow;
