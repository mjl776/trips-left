import { FC } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type CardTone = "highlight" | "cyan" | "magenta";

const TONE_CLASS: Record<CardTone, string> = {
  highlight: styles.highlight,
  cyan: styles.cyan,
  magenta: styles.magenta,
};

const HOME_CARDS: { tag: string; tone: CardTone; title: string; body: string }[] = [
  {
    tag: "BEST PLAYER",
    tone: "highlight",
    title: "Who is actually carrying you",
    body: "Every rostered player scored against your league's own scoring settings — not a generic average.",
  },
  {
    tag: "WORST PLAYER",
    tone: "magenta",
    title: "The starter to cut loose",
    body: "Kickers and defenses are held out, so the verdict lands on a player you can actually replace.",
  },
  {
    tag: "DARK HORSE",
    tone: "cyan",
    title: "Top-20% metrics, quiet box score",
    body: "A rostered player whose season EPA already clears the top-20% cutoff at their position.",
  },
];

const Homepage: FC = () => {
  return (
    <div className={styles.hero}>
      <h1 className={styles.heading}>Know your lineup before Sunday does.</h1>
      <p className={styles.subtext}>
        Build a lineup against your real league&apos;s scoring, then read the three verdicts that matter: your best
        player, your worst, and the dark horse whose advanced metrics already sit in the top 20% of their position.
      </p>
      <div className={styles.ctaRow}>
        <Link href="/lineup-management/create" className={styles.primaryButton}>
          Create a lineup
        </Link>
        <Link href="/lineup-management" className={styles.secondaryButton}>
          My lineups
        </Link>
      </div>
      <div className={styles.cardRow}>
        {HOME_CARDS.map((card) => (
          <div key={card.tag} className={styles.card}>
            <div className={`${styles.cardTag} ${TONE_CLASS[card.tone]}`}>
              {card.tag}
            </div>
            <div className={styles.cardTitle}>{card.title}</div>
            <div className={styles.cardBody}>{card.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Homepage;
