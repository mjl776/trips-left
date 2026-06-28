"use client";

import { FC } from "react";
import styles from "./page.module.css";
import type { LineupSlot as LineupSlotType } from "../LineupSlotsList";

type LineupSlotProps = {
  slot: LineupSlotType;
  onClick?: (slot: LineupSlotType) => void;
};

const LineupSlot: FC<LineupSlotProps> = ({ slot, onClick }) => {
  return (
    <div className={styles.slot}>
      <span className={styles.position}>{slot.label}</span>
      <span className={styles.placeholder}>{slot.assignedPlayerName ?? "Empty"}</span>
      {onClick && (
        <button
          type="button"
          className={styles.addCircle}
          aria-label={`Add player to ${slot.label}`}
          onClick={() => onClick(slot)}
        >
          <span className={styles.plus}>+</span>
        </button>
      )}
    </div>
  );
};

export default LineupSlot;
