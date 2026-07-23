import type { FocusRunState } from "../game/focus";
import { FOCUS_MAX_SPEED_TIER, focusSpeedTarget } from "../game/focus";
import type { Track } from "../game/levels";
import styles from "./FocusGate.module.css";

export type FocusGateKind = "accuracyToSpeed" | "speedTier";

interface FocusGateProps {
  run: FocusRunState;
  gate: FocusGateKind;
  track: Track;
  unlockedLevel: number;
  recentWpm: number[];
  lastAccuracy: number;
  lastWpm: number;
  lastFocusMisses: number;
  onProgress: () => void;
  onPracticeAgain: () => void;
  onExit: () => void;
}

export function FocusGate({
  run,
  gate,
  track,
  unlockedLevel,
  recentWpm,
  lastAccuracy,
  lastWpm,
  lastFocusMisses,
  onProgress,
  onPracticeAgain,
  onExit,
}: FocusGateProps) {
  const canRaiseTier = run.speedTier < FOCUS_MAX_SPEED_TIER;
  const nextTarget = focusSpeedTarget(unlockedLevel, track, recentWpm, run.speedTier + 1);

  const kicker = gate === "accuracyToSpeed" ? "Accuracy cleared" : "Speed target hit";
  const headline =
    gate === "accuracyToSpeed"
      ? `Ready for speed on ${run.plan.fingerLabel}?`
      : canRaiseTier
        ? `Raise the bar to ${nextTarget} WPM?`
        : "Session complete at top tier";

  const detail =
    gate === "accuracyToSpeed"
      ? `${run.plan.reason} You finished with zero focus-zone misses.`
      : `You hit ${lastWpm} WPM at ${lastAccuracy}% accuracy with ${lastFocusMisses} focus misses.`;

  const progressLabel =
    gate === "accuracyToSpeed"
      ? `Progress to speed · ${run.targetWpm} WPM`
      : canRaiseTier
        ? `Increase difficulty · ${nextTarget} WPM`
        : "Finish session";

  const practiceLabel =
    gate === "accuracyToSpeed" ? "Practice accuracy again" : "Practice this speed again";

  return (
    <section className={styles.wrap}>
      <header className={styles.top}>
        <button type="button" className={styles.back} onClick={onExit}>
          Exit
        </button>
        <h1>Focus</h1>
      </header>

      <div className={styles.card}>
        <p className={styles.kicker}>{kicker}</p>
        <h2>{headline}</h2>
        <p className={styles.detail}>{detail}</p>
        <p className={styles.stats}>
          Last round · {lastAccuracy}% accuracy · {lastWpm} WPM · {lastFocusMisses} focus misses
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onProgress}>
            {progressLabel}
          </button>
          <button type="button" className={styles.secondary} onClick={onPracticeAgain}>
            {practiceLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
