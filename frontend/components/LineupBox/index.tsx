import { FC } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type LineupBoxProps = {
  name: string;
  leagueId: string;
  rosterId: string;
  isMock: boolean;
  createdAt: string;
  pointsTotal: number | null;
};

const LineupBox: FC<LineupBoxProps> = ({ name, leagueId, rosterId, isMock, createdAt, pointsTotal }) => {
  const savedDate = new Date(createdAt);
  const savedLabel = Number.isNaN(savedDate.getTime()) ? "" : savedDate.toLocaleDateString();

  return (
    <Link href={`/lineup-management/view-lineup?leagueId=${leagueId}&rosterId=${rosterId}`} className={styles.box}>
      <div>
        <div className={`${styles.tag} ${isMock ? styles.cyan : styles.muted}`}>
          {isMock ? "MOCK LEAGUE" : "SLEEPER"}
        </div>
        <div className={styles.name}>{name || "Untitled Lineup"}</div>
        <div className={styles.meta}>
          {leagueId.slice(0, 12)}
          {savedLabel && ` · saved ${savedLabel}`}
        </div>
      </div>
      <div className={styles.footer}>
        <div>
          <div className={styles.points}>{pointsTotal === null ? "—" : pointsTotal.toFixed(1)}</div>
          <div className={styles.pointsLabel}>starter pts</div>
        </div>
        <div className={styles.open}>Open →</div>
      </div>
    </Link>
  );
};

export default LineupBox;
