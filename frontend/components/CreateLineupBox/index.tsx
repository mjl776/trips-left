"use client";

import { FC } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const CreateLineupBox: FC = () => {
  const router = useRouter();

  return (
    <button
      type="button"
      className={styles.createLineupBox}
      aria-label="Create mock lineup"
      onClick={() => router.push("/lineup-management/create")}
    >
      <span className={styles.createLineupCircle}>
        <span className={styles.plus}>+</span>
      </span>
      <div className={styles.label}>Create a Mock Lineup</div>
    </button>
  );
};

export default CreateLineupBox;
