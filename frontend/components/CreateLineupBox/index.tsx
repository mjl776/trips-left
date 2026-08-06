import { FC } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const CreateLineupBox: FC = () => {
  return (
    <Link href="/lineup-management/create" className={styles.createLineupBox} aria-label="Create a lineup">
      <span className={styles.createLineupCircle}>
        <span className={styles.plus}>+</span>
      </span>
      <div className={styles.label}>Create a lineup</div>
    </Link>
  );
};

export default CreateLineupBox;
