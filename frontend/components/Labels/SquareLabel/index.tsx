import { FC } from "react";
import styles from './page.module.css'

type SquareLabelProps = {
    labelText: string;
    tone?: "cyan" | "magenta";
}

const SquareLabel: FC<SquareLabelProps> = ({ labelText, tone = "cyan" }) => {
    return (
        <div className={`${styles.squareLabel} ${tone === "magenta" ? styles.magenta : styles.cyan}`}>
            { labelText }
        </div>
    );
}

export default SquareLabel;
