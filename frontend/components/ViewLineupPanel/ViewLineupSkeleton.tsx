import { FC } from "react";
import Skeleton from "@/components/Skeleton";
import LineupInsightsPanel from "@/components/LineupInsightsPanel";
import { PROJECTION_BASE_SEASON } from "@/lib/playerStats";
import styles from "./page.module.css";

// 10 rows = the fixed mock roster starter count; starterLabels is unknown
// before /view-lineup resolves. Varied widths keep the rows looking natural.
const NAME_W = ["52%", "44%", "58%", "40%", "48%", "55%", "42%", "50%", "46%", "38%"];
const META_W = ["30%", "26%", "32%", "24%", "28%", "34%", "25%", "30%", "27%", "22%"];
const BENCH_W = ["46%", "38%", "52%"];

// Roster column placeholder. Every block matches the size of the element it
// replaces (header, LineupSlot rows, BenchRow rows) so nothing jumps on load.
export const RosterSkeleton: FC = () => (
  <div aria-busy="true">
    <span className={styles.visuallyHidden}>Loading…</span>

    <div className={styles.header} aria-hidden="true">
      <div className={styles.skeletonStack}>
        <Skeleton width="6.5rem" height="0.75rem" />
        <Skeleton width="15rem" height="2.25rem" />
      </div>
      <div className={`${styles.skeletonStack} ${styles.skeletonStackEnd}`}>
        <Skeleton width="6.5rem" height="2.25rem" />
        <Skeleton width="8.5rem" height="0.6875rem" />
      </div>
    </div>

    <div className={styles.skeletonStarters} aria-hidden="true">
      <div className={styles.skeletonDivider}>Starters</div>
      {NAME_W.map((nameWidth, index) => (
        <div key={index} className={styles.skeletonSlot}>
          <Skeleton width="3rem" height="3rem" />
          <span className={styles.skeletonLines}>
            <Skeleton width={nameWidth} height="0.9375rem" />
            <Skeleton width={META_W[index]} height="0.75rem" />
          </span>
          <Skeleton width="4.75rem" height="2.5rem" />
        </div>
      ))}
    </div>

    <div className={styles.benchHeader}>BENCH</div>
    <div className={styles.benchGrid} aria-hidden="true">
      {BENCH_W.map((nameWidth, index) => (
        <div key={index} className={styles.skeletonBenchRow}>
          <Skeleton width="1.75rem" height="0.6875rem" />
          <span className={styles.skeletonLines}>
            <Skeleton width={nameWidth} height="0.875rem" />
            <Skeleton width="2.25rem" height="0.6875rem" />
          </span>
          <span className={styles.skeletonTrailing}>
            <Skeleton width="4.75rem" height="2.5rem" />
            <Skeleton width="3.25rem" height="1.625rem" radius="round" />
            <Skeleton width="3.25rem" height="1.625rem" radius="round" />
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Full-page placeholder for the route's <Suspense> fallback. Hook-free so it
// can be prerendered into the initial HTML.
const ViewLineupSkeleton: FC = () => (
  <div className={styles.layout}>
    <div className={styles.main}>
      <RosterSkeleton />
    </div>
    <LineupInsightsPanel insights={null} season={PROJECTION_BASE_SEASON} status="loading" />
  </div>
);

export default ViewLineupSkeleton;
