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
};

const LineupSlot: FC<LineupSlotProps> = ({ slot, onClick, onViewPlayer }) => {
  return (
    <div className={styles.slot}>
      <button
        type="button"
        className={styles.playerInfo}
        disabled={!slot.assignedPlayerName || !onViewPlayer}
        onClick={() => onViewPlayer?.(slot)}
      >
        <span className={styles.position}>{slot.label}</span>
        <span className={styles.placeholder}>{slot.assignedPlayerName ?? "Empty"}</span>
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
      {onClick && slot.assignedPlayerName && (
        <>
          {slot.isBestPlayer && <SquareLabel labelText="Best Player"/>}
          {slot.isDarkHorse && <SquareLabel labelText="Dark Horse"/>}
          {slot.isWorstPlayer && <SquareLabel labelText="Worst Player"/>}
          <SquareLabel labelText="Proj. Points"/>
          <ProjectPointsBox stats={slot.assignedPlayerStats} />
        </>
      )}

    </div>
  );
};

export default LineupSlot;
