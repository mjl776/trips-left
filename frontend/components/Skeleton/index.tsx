import { FC } from "react";
import styles from "./page.module.css";

type SkeletonProps = {
  width?: string;
  height?: string;
  // card → 1rem, badge → 0.75rem, round → 999px (a pill; a circle when width === height).
  radius?: "card" | "badge" | "round";
  className?: string;
};

// Purely decorative placeholder block. Consumers wrap a loading region in an
// `aria-busy` container with one visually hidden "Loading…" label, so screen
// readers get a single announcement instead of one per block.
const Skeleton: FC<SkeletonProps> = ({ width = "100%", height = "1rem", radius = "badge", className }) => {
  const classes = [styles.skeleton, styles[radius], className].filter(Boolean).join(" ");
  return <span aria-hidden="true" data-skeleton="" className={classes} style={{ width, height }} />;
};

export default Skeleton;
