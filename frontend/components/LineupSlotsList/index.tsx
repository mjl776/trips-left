"use client";

import { FC, Fragment } from "react";
import styles from "./page.module.css";

export type LineupSlot = {
  id: string;
  label: string;
  assignedPlayerName?: string | null;
};

export type LineupSlotSection = {
  title: string;
  slots: LineupSlot[];
};

type LineupSlotsListProps = {
  sections: LineupSlotSection[];
  onSlotClick?: (slot: LineupSlot) => void;
};

const LineupSlotsList: FC<LineupSlotsListProps> = ({ sections, onSlotClick }) => {
  return (
    <div className={styles.panel}>
      {sections.map((section) => (
        <Fragment key={section.title}>
          <div className={styles.divider}>{section.title}</div>
          {section.slots.map((slot) => (
            <div key={slot.id} className={styles.slot}>
              <span className={styles.position}>{slot.label}</span>
              <span className={styles.placeholder}>{slot.assignedPlayerName ?? "Empty"}</span>
              {onSlotClick && (
                <button
                  type="button"
                  className={styles.addCircle}
                  aria-label={`Add player to ${slot.label}`}
                  onClick={() => onSlotClick(slot)}
                >
                  <span className={styles.plus}>+</span>
                </button>
              )}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
};

export default LineupSlotsList;
