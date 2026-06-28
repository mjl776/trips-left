"use client";

import { FC, Fragment } from "react";
import styles from "./page.module.css";
import LineupSlotComponent from "../LineupSlot";

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
            <LineupSlotComponent key={slot.id} slot={slot} onClick={onSlotClick} />
          ))}
        </Fragment>
      ))}
    </div>
  );
};

export default LineupSlotsList;
