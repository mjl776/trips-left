"use client";

import { FC } from "react";
import styles from "./page.module.css";
import type { AddPlayerOverlayPlayer } from "../AddPlayerOverlay";
import type { PlayerStats } from "../LineupSlotsList";
import ProjectPointsBox from "../ProjectedPointsBox";

type BenchRowProps = {
  player: AddPlayerOverlayPlayer | null;
  stats?: PlayerStats;
  onView?: () => void;
  onSwap?: () => void;
  onDrop?: () => void;
  onAdd?: () => void;
  disabled?: boolean;
};

const BenchRow: FC<BenchRowProps> = ({ player, stats, onView, onSwap, onDrop, onAdd, disabled }) => {
  if (!player) {
    return (
      <div className={`${styles.row} ${styles.empty}`}>
        <span className={styles.position}>BN</span>
        <span className={styles.info}>
          <span className={styles.name}>Empty bench slot</span>
          <span className={styles.meta}>Add a player to fill this spot</span>
        </span>
        {onAdd && (
          <button
            type="button"
            className={styles.addCircle}
            aria-label="Add player to bench"
            onClick={onAdd}
            disabled={disabled}
          >
            <span className={styles.plus}>+</span>
          </button>
        )}
      </div>
    );
  }

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
