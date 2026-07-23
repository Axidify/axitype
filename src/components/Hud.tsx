import { PACE_GATE_MESSAGE } from "../game/coaching";
import styles from "./Hud.module.css";

interface HudProps {
  score: number;
  combo: number;
  wpm: number;
  accuracy: number;
  remainingMs: number | null;
  paceGated: boolean;
  paceCoach?: boolean;
}

export function Hud({
  score,
  combo,
  wpm,
  accuracy,
  remainingMs,
  paceGated,
  paceCoach = false,
}: HudProps) {
  return (
    <div className={styles.hud}>
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.label}>Score</span>
          <strong>{score}</strong>
        </div>
        <div className={`${styles.stat} ${combo > 1 ? styles.hot : ""}`}>
          <span className={styles.label}>Combo</span>
          <strong>×{combo}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>WPM</span>
          <strong>{wpm}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Accuracy</span>
          <strong>{accuracy}%</strong>
        </div>
        {remainingMs !== null && (
          <div className={styles.stat}>
            <span className={styles.label}>Time</span>
            <strong>{Math.ceil(remainingMs / 1000)}s</strong>
          </div>
        )}
      </div>

      {paceCoach && (
        <div className={styles.paceRow} role="status" aria-live="polite" aria-atomic="true">
          <p className={`${styles.pace} ${paceGated ? styles.paceVisible : styles.paceHidden}`}>
            {PACE_GATE_MESSAGE}
          </p>
        </div>
      )}
    </div>
  );
}
