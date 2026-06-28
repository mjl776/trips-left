"use client";

import { FC } from "react";
import styles from "./page.module.css";

const Homepage: FC = () => {
    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>
            Welcome to Trips Left! A Fantasy Football Optimizer Site
            </h1>
      </div>
    )
}

export default Homepage;