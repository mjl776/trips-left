"use client";

import { FC } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

type LineupBoxProps = {
  name: string;
  leagueId: string;
  rosterId: string;
};

const LineupBox: FC<LineupBoxProps> = ({ name, leagueId, rosterId }) => {

  const router = useRouter();

  return (
    <button
      type="button"
      className={styles.box}
      onClick={() => router.push(`/lineup-management/view-lineup?leagueId=${leagueId}&rosterId=${rosterId}`)}
    >
      <div className={styles.name}>{name || "Untitled Lineup"}</div>
    </button>
  );
};

export default LineupBox;
