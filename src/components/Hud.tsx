import { useEffect, useRef, useState } from "react";
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
  const [showAccTip, setShowAccTip] = useState(false);
  const [comboPop, setComboPop] = useState(false);
  const prevCombo = useRef(combo);

  useEffect(() => {
    if (combo > prevCombo.current && combo > 1) {
      setComboPop(false);
      const frame = requestAnimationFrame(() => setComboPop(true));
      const t = setTimeout(() => setComboPop(false), 280);
      prevCombo.current = combo;
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(t);
      };
    }
    prevCombo.current = combo;
  }, [combo]);

  return (
    <div className={styles.hud}>
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.label}>Score</span>
          <strong>{score}</strong>
        </div>
        <div
          className={`${styles.stat} ${combo > 1 ? styles.hot : ""} ${comboPop ? styles.comboPop : ""}`}
        >
          <span className={styles.label}>Combo</span>
          <strong>×{combo}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>WPM</span>
          <strong>{wpm}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>
            Accuracy
            <button
              type="button"
              className={styles.tipBtn}
              aria-label="How accuracy works"
              aria-expanded={showAccTip}
              onClick={() => setShowAccTip((v) => !v)}
            >
              ?
            </button>
          </span>
          <strong>{accuracy}%</strong>
        </div>
        {remainingMs !== null && (
          <div className={styles.stat}>
            <span className={styles.label}>Time</span>
            <strong>{Math.ceil(remainingMs / 1000)}s</strong>
          </div>
        )}
      </div>

      {showAccTip && (
        <p className={styles.accTip} role="note">
          Accuracy = keys you got right out of the full prompt. Misses stick — correct keys never
          raise it again.
        </p>
      )}

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
