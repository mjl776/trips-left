import { FC } from "react"
import styles from "./page.module.css";

const ABOUT_CARDS: { tag: string; title: string; body: string }[] = [
    {
        tag: "LEAGUE",
        title: "Mock or imported",
        body: "Create a league with Sleeper's default scoring, or import a real one by ID. Every lineup hangs off one set of scoring rules.",
    },
    {
        tag: "LINEUP",
        title: "Add, drop, swap",
        body: "Slot eligibility is enforced on both ends — a WR can't land in the TE slot, and FLEX takes RB, WR, or TE.",
    },
    {
        tag: "INSIGHTS",
        title: "Three verdicts",
        body: "Best player, worst player, and a dark horse whose EPA already sits in the top 20% of his position.",
    },
];

export const AboutPageComponent: FC = () => {
    return (
        <div className={styles.container}>
            <div className={styles.microLabel}>ABOUT</div>
            <h1 className={styles.heading}>Trips Left</h1>
            <div className={styles.content}>
                <p className={styles.paragraph}>
                    Trips Left helps fantasy football managers get more out of the roster they already have.
                    Build a mock lineup and see exactly where you stand — your best player, your worst, and a data-driven &quot;dark horse&quot; who might be a bigger weapon than you realize. It&apos;s built for polishing the team you&apos;ve got, not chasing the next waiver add.
                </p>
                <p className={styles.paragraph}>
                    &quot;Trips left&quot; is a formation: three receivers bunched on the left side of the offense, one on the right. The name is about alignment — figuring out what your team is actually built to do, then lining it up that way.
                </p>
            </div>
            <div className={styles.cardRow}>
                {ABOUT_CARDS.map((card) => (
                    <div key={card.tag} className={styles.card}>
                        <div className={styles.cardTag}>{card.tag}</div>
                        <div className={styles.cardTitle}>{card.title}</div>
                        <div className={styles.cardBody}>{card.body}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}
