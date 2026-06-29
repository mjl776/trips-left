import { FC } from "react";
import styles from './page.module.css'
import type { PlayerStats } from "../LineupSlotsList";

type ProjectPointsBoxProps = {
  stats?: PlayerStats;
};

const ProjectPointsBox: FC<ProjectPointsBoxProps> = ({ stats }) => {
  return (
    <div className={styles.box}>
        <div>
            {stats ? stats.totalPoints.toFixed(1) : "—"}
        </div>
    </div>
  );
}

export default ProjectPointsBox;