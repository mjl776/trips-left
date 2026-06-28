"use client";

import { FC, useEffect, useState } from "react";
import styles from "./page.module.css";
import CreateLineupBox from "@/components/CreateLineupBox";
import { getSavedLineups, SavedLineup } from "@/lib/savedLineups";
import LineupBox from "../LineupBox";

const LineupManagementLandingPage: FC = () => {

  const [lineups, setLineups] = useState<SavedLineup[]>([]);
  useEffect(() => {
     const savedLineups = getSavedLineups();
     setLineups(savedLineups);
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <CreateLineupBox />
        { lineups.length > 0 && lineups.map((lineup, index)=> {
              const indexKey = `lineup-${index}`;
              return (
                  <div key={indexKey}>
                    <LineupBox
                      name={lineup.name}
                      leagueId={lineup.leagueId}
                      rosterId={lineup.rosterId}
                    />
                  </div>
              );
            })
        }
      </div>
    </div>
  );
};

export default LineupManagementLandingPage;
