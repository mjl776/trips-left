"use client";

import { FC, useEffect, useState } from "react";
import styles from "./page.module.css";
import CreateLineupBox from "@/components/CreateLineupBox";
import LineupBox from "@/components/LineupBox";
import { getSavedLineups, SavedLineup } from "@/lib/savedLineups";
import { fetchStarterPointsTotal } from "@/lib/lineupTotals";

const LineupManagementLandingPage: FC = () => {
  const [lineups, setLineups] = useState<SavedLineup[]>([]);
  const [pointsByRosterId, setPointsByRosterId] = useState<Record<string, number | null>>({});

  useEffect(() => {
    Promise.resolve().then(() => setLineups(getSavedLineups()));
  }, []);

  useEffect(() => {
    lineups.forEach((lineup) => {
      fetchStarterPointsTotal(lineup.rosterId, lineup.leagueId).then((total) => {
        setPointsByRosterId((prev) => ({ ...prev, [lineup.rosterId]: total }));
      });
    });
  }, [lineups]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div className={styles.microLabel}>SAVED ON THIS DEVICE</div>
          <h2 className={styles.heading}>My lineups</h2>
        </div>
        <div className={styles.countLabel}>
          {lineups.length} {lineups.length === 1 ? "lineup" : "lineups"}
        </div>
      </div>
      <div className={styles.grid}>
        <CreateLineupBox />
        {lineups.map((lineup) => (
          <LineupBox
            key={lineup.rosterId}
            name={lineup.name}
            leagueId={lineup.leagueId}
            rosterId={lineup.rosterId}
            isMock={lineup.isMock}
            createdAt={lineup.createdAt}
            pointsTotal={pointsByRosterId[lineup.rosterId] ?? null}
          />
        ))}
      </div>
    </div>
  );
};

export default LineupManagementLandingPage;
