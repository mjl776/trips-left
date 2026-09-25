import { FC } from "react";
import styles from "./page.module.css";
import Skeleton from "@/components/Skeleton";
import type { LineupInsights } from "@/types/PlayerTypes";

export type InsightsStatus = "loading" | "ready" | "error";

type LineupInsightsPanelProps = {
  insights: LineupInsights | null;
  season: number;
  // Defaults to "ready" so static callers (and existing tests) keep today's rendering.
  status?: InsightsStatus;
  onRetry?: () => void;
};

const CARD_TAGS = [
  { label: "BEST PLAYER", tone: "cyan", nameWidth: "62%" },
  { label: "WORST PLAYER", tone: "magenta", nameWidth: "58%" },
  { label: "DARK HORSE", tone: "cyan", nameWidth: "48%", hasBar: true },
] as const;

// Loading keeps each card's real tag header so the panel doesn't jump when
// data lands; only the value, name, and detail lines become skeletons.
const LoadingCards: FC = () => (
  <div className={styles.cards} aria-busy="true">
    <span className={styles.visuallyHidden}>Loading…</span>
    {CARD_TAGS.map((tag) => (
      <div key={tag.label} className={styles.card}>
        <div className={styles.cardTop}>
          <span className={`${styles.cardTag} ${styles[tag.tone]}`}>{tag.label}</span>
          <Skeleton width="3rem" height="0.9375rem" />
        </div>
        <div className={styles.skeletonBody}>
          <Skeleton width={tag.nameWidth} height="1.0625rem" />
          <Skeleton width="100%" height="0.75rem" className={styles.skeletonDetail} />
          <Skeleton width="72%" height="0.75rem" />
          {"hasBar" in tag && <Skeleton width="100%" height="0.375rem" radius="round" className={styles.skeletonBar} />}
        </div>
      </div>
    ))}
  </div>
);

const EPA_LABELS: Record<string, string> = {
  passing_epa: "passing EPA",
  rushing_epa: "rushing EPA",
  receiving_epa: "receiving EPA",
};

const LineupInsightsPanel: FC<LineupInsightsPanelProps> = ({ insights, season, status = "ready", onRetry }) => {
  const best = insights?.bestPlayer ?? null;
  const worst = insights?.worstPlayer ?? null;
  const darkHorse = insights?.darkHorse ?? null;

  if (status !== "ready") {
    return (
      <div className={styles.sidebar}>
        <div className={styles.panel}>
          <div className={styles.microLabel}>LINEUP INSIGHTS</div>
          {status === "loading" ? (
            <LoadingCards />
          ) : (
            <div className={styles.errorCard} role="alert">
              <div className={styles.errorTitle}>Couldn&apos;t load insights.</div>
              <div className={styles.errorBody}>
                Best, worst and dark horse need the scored roster. Your lineup above is unaffected.
              </div>
              <button type="button" className={styles.retryButton} onClick={onRetry}>
                RETRY
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.panel}>
        <div className={styles.microLabel}>LINEUP INSIGHTS</div>
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardTop}>
              <span className={`${styles.cardTag} ${styles.cyan}`}>BEST PLAYER</span>
              {best && <span className={`${styles.cardValue} ${styles.cyan}`}>{best.totalPoints.toFixed(1)}</span>}
            </div>
            {best ? (
              <>
                <div className={styles.cardName}>{best.fullName}</div>
                <div className={styles.cardDetail}>
                  Most fantasy points on your roster in {season} under this league&apos;s scoring.
                </div>
              </>
            ) : (
              <div className={styles.cardEmpty}>No players rostered yet.</div>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTop}>
              <span className={`${styles.cardTag} ${styles.magenta}`}>WORST PLAYER</span>
              {worst && (
                <span className={`${styles.cardValue} ${styles.magenta}`}>{worst.totalPoints.toFixed(1)}</span>
              )}
            </div>
            {worst ? (
              <>
                <div className={styles.cardName}>{worst.fullName}</div>
                <div className={styles.cardDetail}>
                  Lowest scorer on the roster. Kickers and defenses are excluded from this verdict — they aren&apos;t
                  primary contributors to a team&apos;s ability to win games.
                </div>
              </>
            ) : (
              <div className={styles.cardEmpty}>
                Needs at least two rostered players outside K and DEF before a worst player can be named.
              </div>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTop}>
              <span className={`${styles.cardTag} ${styles.cyan}`}>DARK HORSE</span>
              {darkHorse && (
                <span className={`${styles.cardValue} ${styles.cyan}`}>{darkHorse.value.toFixed(1)}</span>
              )}
            </div>
            {darkHorse ? (
              <>
                <div className={styles.cardName}>{darkHorse.fullName}</div>
                <div className={styles.cardDetail}>
                  Season {EPA_LABELS[darkHorse.stat] ?? darkHorse.stat} of {darkHorse.value.toFixed(1)} clears the
                  top-20% cutoff of {darkHorse.leagueThreshold.toFixed(1)} for {darkHorse.position}s.
                </div>
                {darkHorse.percentile !== null && (
                  <>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${Math.round(darkHorse.percentile)}%` }} />
                    </div>
                    <div className={styles.barLabel}>
                      {darkHorse.position} RANK #{darkHorse.positionRank ?? "—"} OF {darkHorse.positionPlayerCount} ·{" "}
                      {Math.round(darkHorse.percentile)}TH PERCENTILE
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className={styles.cardEmpty}>
                No rostered QB, RB, WR, or TE outside your best player currently clears the top-20% EPA cutoff for
                his position.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineupInsightsPanel;
