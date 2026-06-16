import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>
        Welcome to Trips Left! A Fantasy Football Optimizer Site
      </h1>
    </div>
  );
}
