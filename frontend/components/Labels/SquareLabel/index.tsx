import { FC } from "react";
import styles from './page.module.css'
type SquareLabelProps ={
    labelText: string;
}

const SquareLabel: FC<SquareLabelProps> = ({ labelText }) => {
    return (
        <div className={styles.squareLabel}>
            { labelText }
        </div>
    );
}

export default SquareLabel;