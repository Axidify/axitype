import styles from "./HomeCheck.module.css";

interface HomeCheckProps {
  retrain: boolean;
  onStart: () => void;
}

export function HomeCheck({ retrain, onStart }: HomeCheckProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <p className={styles.kicker}>Home check</p>
        <h2>Fingers on home</h2>
        <p className={styles.copy}>
          Rest on <strong>A S D F</strong> and <strong>J K L ;</strong>. Thumbs on{" "}
          <strong>space</strong>. Find the bumps on <strong>F</strong> and <strong>J</strong>.
        </p>
        {retrain && <p className={styles.retrain}>Speed comes later. Place first.</p>}
        <button type="button" className={styles.cta} onClick={onStart}>
          Press Space or click to start
        </button>
      </div>
    </div>
  );
}
