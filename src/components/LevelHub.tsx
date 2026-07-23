import { DRILLS } from "../game/drills";
import { LEVELS, type DrillKind, type Track } from "../game/levels";
import { formBadgeKey, type ProgressState } from "../lib/storage";
import styles from "./LevelHub.module.css";

interface LevelHubProps {
  progress: ProgressState;
  onTrack: (track: Track) => void;
  onPlayLevel: (id: number) => void;
  onPractice: () => void;
  onStats: () => void;
  onDrill: (kind: DrillKind, afterLevel: number) => void;
  onToggleFormCoach: () => void;
  onToggleSound: () => void;
}

function starsLabel(n: number): string {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));
}

export function LevelHub({
  progress,
  onTrack,
  onPlayLevel,
  onPractice,
  onStats,
  onDrill,
  onToggleFormCoach,
  onToggleSound,
}: LevelHubProps) {
  const continueId = Math.min(progress.unlockedLevel, 12);

  const stageLocked = (levelId: number): boolean => {
    if (progress.track !== "retrain") return false;
    if (levelId <= 1) return false;
    const prev = LEVELS[levelId - 2];
    if (!prev.unlockDrill) return false;
    return !progress.formBadges[formBadgeKey(prev.id, prev.unlockDrill)];
  };

  return (
    <section className={styles.hub}>
      <header className={styles.hero}>
        <p className={styles.brand}>Keylane</p>
        <p className={styles.tag}>Train touch typing. Chase the combo.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => onPlayLevel(continueId)}>
            Continue · Mission {continueId}
          </button>
          <button type="button" className={styles.secondary} onClick={onPractice}>
            Practice
          </button>
          <button type="button" className={styles.secondary} onClick={onStats}>
            Stats
          </button>
        </div>
      </header>

      <div className={styles.tracks}>
        <button
          type="button"
          className={progress.track === "learn" ? styles.trackOn : styles.track}
          onClick={() => onTrack("learn")}
        >
          Learn
        </button>
        <button
          type="button"
          className={progress.track === "retrain" ? styles.trackOn : styles.track}
          onClick={() => onTrack("retrain")}
        >
          Retrain
        </button>
      </div>
      <p className={styles.trackHint}>
        {progress.track === "retrain"
          ? "Form first. Stronger coaching and mandatory drills between stages."
          : "New typists — calmer arena after early missions."}
      </p>

      <div className={styles.prefs}>
        <label>
          <input
            type="checkbox"
            checked={progress.coachPrefs.formCoach || progress.track === "retrain"}
            disabled={progress.track === "retrain"}
            onChange={onToggleFormCoach}
          />
          Form Coach
        </label>
        <label>
          <input
            type="checkbox"
            checked={progress.coachPrefs.sound}
            onChange={onToggleSound}
          />
          Sound
        </label>
      </div>

      <ol className={styles.lane}>
        {LEVELS.map((level) => {
          const locked = level.id > progress.unlockedLevel || stageLocked(level.id);
          const stars = progress.levelStars[level.id] ?? 0;
          const badge =
            level.unlockDrill &&
            progress.formBadges[formBadgeKey(level.id, level.unlockDrill)];
          return (
            <li key={level.id}>
              <button
                type="button"
                className={`${styles.node} ${locked ? styles.locked : ""}`}
                disabled={locked}
                onClick={() => onPlayLevel(level.id)}
              >
                <span className={styles.num}>{level.id}</span>
                <span className={styles.meta}>
                  <strong>{level.title}</strong>
                  <span>{starsLabel(stars)}</span>
                  {badge && <span className={styles.badge}>Form</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className={styles.drills}>
        <h2>Habit drills</h2>
        <div className={styles.drillGrid}>
          {DRILLS.map((d) => {
            const unlocked = progress.unlockedLevel >= d.afterLevel;
            const earned = progress.formBadges[formBadgeKey(d.afterLevel, d.kind)];
            return (
              <button
                key={d.kind}
                type="button"
                className={styles.drill}
                disabled={!unlocked}
                onClick={() => onDrill(d.kind, d.afterLevel)}
              >
                <strong>
                  {d.title} {earned ? "✓" : ""}
                </strong>
                <span>{d.blurb}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
