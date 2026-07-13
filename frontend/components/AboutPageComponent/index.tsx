import { FC } from "react"
import styles from "./page.module.css";

export const AboutPageComponent: FC = () => {
    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>About Trips Left</h1>
            <div className={styles.content}>
            Trips Left helps fantasy football managers get more out of the roster they already have.
            Build a mock lineup and see exactly where you stand — your best player, your worst, and a data-driven "dark horse" who might be a bigger weapon than you realize. It's built for polishing the team you've got, not chasing the next waiver add.
            </div>
        </div>
    )
}