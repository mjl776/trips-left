"use client";

import { FC, useState } from "react";
import CreateLeagueStep from "@/components/CreateLeagueStep";
import CreateLineupSlotsPanel from "@/components/CreateLineupSlotsPanel";
import type { League } from "@/types/LeagueTypes";
import styles from "./page.module.css";

const CreateLineupFlow: FC = () => {
  const [league, setLeague] = useState<League | null>(null);
  // Owned here, not in the slots panel, so "Change league" (which unmounts the
  // panel) doesn't throw away the name the user already typed.
  const [name, setName] = useState("");
  const step = league ? "roster" : "league";

  return (
    <div className={styles.container}>
      <div className={styles.microLabel}>STEP {step === "league" ? "1 OF 2" : "2 OF 2"}</div>
      <h2 className={styles.heading}>{step === "league" ? "Attach a league" : "Build the lineup"}</h2>
      <p className={styles.blurb}>
        {step === "league"
          ? "A lineup can't exist without scoring settings behind it — fantasy points don't mean anything without weights to apply to a stat line."
          : "Fill every starter slot. Position eligibility is enforced the same way the server enforces it, so the picker only offers players who can legally fill the slot."}
      </p>
      <div className={styles.body}>
        {league ? (
          <CreateLineupSlotsPanel
            league={league}
            name={name}
            onNameChange={setName}
            onChangeLeague={() => setLeague(null)}
          />
        ) : (
          <CreateLeagueStep onLeagueAttached={setLeague} />
        )}
      </div>
    </div>
  );
};

export default CreateLineupFlow;
