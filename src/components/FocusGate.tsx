import { useEffect } from "react";
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
  coachingNote?: string | null;
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
  coachingNote = null,
  onProgress,
  onPracticeAgain,
  onExit,
}: FocusGateProps) {
  const canRaiseTier = run.speedTier < FOCUS_MAX_SPEED_TIER;
  const nextTarget = focusSpeedTarget(unlockedLevel, track, recentWpm, run.speedTier + 1);

  const kicker = gate === "accuracyToSpeed" ? "Accuracy cleared" : "Speed target hit";
  const headline =
    gate === "accuracyToSpeed"
      ? `Speed round next — hit ${run.targetWpm} WPM with zero zone misses`
      : canRaiseTier
        ? `Raise the bar to ${nextTarget} WPM?`
        : "All 3 speed tiers cleared";

  const detail =
    gate === "accuracyToSpeed"
      ? run.plan.reason
      : `You hit ${lastWpm} WPM at ${lastAccuracy}% accuracy with ${lastFocusMisses} focus misses.`;

  const phaseNote =
    gate === "accuracyToSpeed"
      ? "Speed rounds use longer prompts and raise the WPM bar each tier."
      : null;

  const progressLabel =
    gate === "accuracyToSpeed"
      ? `Start speed · ${run.targetWpm} WPM target`
      : canRaiseTier
        ? `Next tier · ${nextTarget} WPM`
        : "Finish session";

  const practiceLabel =
    gate === "accuracyToSpeed" ? "Practice accuracy again" : "Practice this speed again";

  const tierNote =
    gate === "speedTier"
      ? canRaiseTier
        ? `Speed tier ${run.speedTier} of ${FOCUS_MAX_SPEED_TIER} cleared.`
        : `All ${FOCUS_MAX_SPEED_TIER} speed tiers cleared.`
      : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      e.preventDefault();
      onProgress();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onProgress]);

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
        {phaseNote && <p className={styles.phaseNote}>{phaseNote}</p>}
        {tierNote && <p className={styles.phaseNote}>{tierNote}</p>}
        <p className={styles.stats}>
          Last round · {lastAccuracy}% accuracy · {lastWpm} WPM · {lastFocusMisses} focus misses
        </p>
        {coachingNote && <p className={styles.coaching}>{coachingNote}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onProgress}>
            {progressLabel} <span className={styles.kbd}>Space</span>
          </button>
          <button type="button" className={styles.secondary} onClick={onPracticeAgain}>
            {practiceLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
