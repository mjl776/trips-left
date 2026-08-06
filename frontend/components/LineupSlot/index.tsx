"use client";

import { FC } from "react";
import styles from "./page.module.css";
import type { LineupSlot as LineupSlotType } from "../LineupSlotsList";
import ProjectPointsBox from "../ProjectedPointsBox";
import SquareLabel from "../Labels/SquareLabel";

type LineupSlotProps = {
  slot: LineupSlotType;
  onClick?: (slot: LineupSlotType) => void;
  onViewPlayer?: (slot: LineupSlotType) => void;
  onRemove?: (slot: LineupSlotType) => void;
  onSwapTarget?: (slot: LineupSlotType) => void;
};

const LineupSlot: FC<LineupSlotProps> = ({ slot, onClick, onViewPlayer, onRemove, onSwapTarget }) => {
  const rowClassName = `${styles.slot} ${slot.isWorstPlayer ? styles.worstRail : ""} ${
    slot.swapTarget ? styles.swapTarget : ""
  }`;

  if (slot.swapTarget && onSwapTarget) {
    return (
      <button type="button" className={rowClassName} onClick={() => onSwapTarget(slot)}>
        <span className={styles.position}>{slot.label}</span>
        <span className={styles.info}>
          <span className={styles.name}>{slot.assignedPlayerName}</span>
          {slot.meta && <span className={styles.meta}>{slot.meta}</span>}
        </span>
        <span className={styles.actions}>
          <ProjectPointsBox stats={slot.assignedPlayerStats} />
        </span>
      </button>
    );
  }

  return (
    <div className={rowClassName}>
      <button
        type="button"
        className={styles.playerInfo}
        disabled={!slot.assignedPlayerName || !onViewPlayer}
        onClick={() => onViewPlayer?.(slot)}
      >
        <span className={styles.position}>{slot.label}</span>
        <span className={styles.info}>
          <span className={styles.name}>{slot.assignedPlayerName ?? "Empty"}</span>
          {slot.assignedPlayerName && slot.meta && <span className={styles.meta}>{slot.meta}</span>}
        </span>
      </button>
      {onClick && !slot.assignedPlayerName && (
        <button
          type="button"
          className={styles.addCircle}
          aria-label={`Add player to ${slot.label}`}
          onClick={() => onClick(slot)}
        >
          <span className={styles.plus}>+</span>
        </button>
      )}
      {slot.assignedPlayerName && (
        <span className={styles.actions}>
          {slot.isBestPlayer && <SquareLabel labelText="Best Player" tone="cyan" />}
          {slot.isDarkHorse && <SquareLabel labelText="Dark Horse" tone="cyan" />}
          {slot.isWorstPlayer && <SquareLabel labelText="Worst Player" tone="magenta" />}
          <ProjectPointsBox stats={slot.assignedPlayerStats} />
          {onRemove && (
            <button
              type="button"
              className={styles.removeCircle}
              aria-label={`Remove player from ${slot.label}`}
              onClick={() => onRemove(slot)}
            >
              <span className={styles.minus}>&minus;</span>
            </button>
          )}
        </span>
      )}
    </div>
  );
};

export default LineupSlot;
