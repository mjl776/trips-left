"use client";

import { FC, Fragment } from "react";
import styles from "./page.module.css";
import LineupSlotComponent from "../LineupSlot";

export type LineupSlot = {
  id: string;
  label: string;
  assignedPlayerId?: string | null;
  assignedPlayerName?: string | null;
  assignedPlayerStats?: PlayerStats;
  isDarkHorse?: boolean;
  isBestPlayer?: boolean;
  isWorstPlayer?: boolean;
};

// Mirrors PlayerSeasonOverview in backend/src/player/player.models.ts
export type PlayerStats = {
  fullName: number;
  gamesPlayed: number | null;
  position: string;
  season: number;
  team: string | null;
  totalPoints: number;
  positionRank: number | null;
  positionPlayerCount: number;
}

export type LineupSlotSection = {
  title: string;
  slots: LineupSlot[];
};

type LineupSlotsListProps = {
  sections: LineupSlotSection[];
  onSlotClick?: (slot: LineupSlot) => void;
  onViewPlayer?: (slot: LineupSlot) => void;
};

const LineupSlotsList: FC<LineupSlotsListProps> = ({ sections, onSlotClick, onViewPlayer }) => {
  return (
    <div className={styles.panel}>
      {sections.map((section) => (
        <Fragment key={section.title}>
          <div className={styles.divider}>{section.title}</div>
          {section.slots.map((slot) => (
            <LineupSlotComponent
              key={slot.id}
              slot={slot}
              onClick={onSlotClick}
              onViewPlayer={onViewPlayer}
            />
          ))}
        </Fragment>
      ))}
    </div>
  );
};

export default LineupSlotsList;
