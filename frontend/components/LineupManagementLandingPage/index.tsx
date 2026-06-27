"use client";

import { FC } from "react";
import styles from "./page.module.css";
import CreateLineupBox from "../CreateLineupBox";

const LineupManagementLandingPage: FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <CreateLineupBox />
      </div>
    </div>
  );
};

export default LineupManagementLandingPage;
