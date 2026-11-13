import { FC } from "react";
import styles from './page.module.css'

// highlight = Best Player, cyan = Dark Horse, magenta = Worst Player.
export type SquareLabelTone = "cyan" | "magenta" | "highlight";

type SquareLabelProps = {
    labelText: string;
    tone?: SquareLabelTone;
}

const SquareLabel: FC<SquareLabelProps> = ({ labelText, tone = "cyan" }) => {
    return (
        <div className={`${styles.squareLabel} ${styles[tone]}`}>
            { labelText }
        </div>
    );
}

export default SquareLabel;
