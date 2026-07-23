import { DRILLS, getDrill } from "../game/drills";
import { formatDailyLabel, localDateKey, todaysDailyBest } from "../game/daily";
import { FOCUS_UNLOCK_LEVEL, isFocusUnlocked } from "../game/focus";
import { GAUNTLET_UNLOCK_LEVEL, isGauntletUnlocked } from "../game/gauntlet";
import {
  accuracyGate,
  LEVELS,
  type DrillKind,
  type Track,
} from "../game/levels";
import { formBadgeKey, type ProgressState } from "../lib/storage";
import { RetrainIntro } from "./RetrainIntro";
import styles from "./LevelHub.module.css";

interface LevelHubProps {
  progress: ProgressState;
  onTrack: (track: Track) => void;
  onPlayLevel: (id: number) => void;
  onPractice: (timedSeconds?: number) => void;
  onDaily: () => void;
  onGauntlet: () => void;
  onFocus: () => void;
  focusPreview?: string | null;
  onStats: () => void;
  onDrill: (kind: DrillKind, afterLevel: number) => void;
  onToggleFormCoach: () => void;
  onToggleSound: () => void;
  onToggleDemoMode: () => void;
  onDismissTrackExplainer: () => void;
  onDismissRetrainIntro: () => void;
}

function starsLabel(n: number): string {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));
}

function drillGateFor(levelId: number): { kind: DrillKind; afterLevel: number; title: string } | null {
  if (levelId <= 1) return null;
  const prev = LEVELS[levelId - 2];
  if (!prev.unlockDrill) return null;
  const drill = getDrill(prev.unlockDrill);
  return { kind: prev.unlockDrill, afterLevel: prev.id, title: drill.title };
}

export function LevelHub({
  progress,
  onTrack,
  onPlayLevel,
  onPractice,
  onDaily,
  onGauntlet,
  onFocus,
  focusPreview = null,
  onStats,
  onDrill,
  onToggleFormCoach,
  onToggleSound,
  onToggleDemoMode,
  onDismissTrackExplainer,
  onDismissRetrainIntro,
}: LevelHubProps) {
  const demo = progress.coachPrefs.demoMode;
  const continueId = Math.min(progress.unlockedLevel, 12);
  const gauntletOpen = isGauntletUnlocked(progress.unlockedLevel, demo);
  const focusOpen = isFocusUnlocked(progress.unlockedLevel, demo);
  const dateKey = localDateKey();
  const dailyBest = todaysDailyBest(progress.dailyBest, dateKey);
  const gate = accuracyGate(progress.track);
  const showExplainer = !progress.coachPrefs.seenTrackExplainer;
  const showRetrainIntro =
    progress.track === "retrain" && !progress.coachPrefs.seenRetrainIntro;

  const stageLocked = (levelId: number): boolean => {
    if (demo) return false;
    if (progress.track !== "retrain") return false;
    const gateInfo = drillGateFor(levelId);
    if (!gateInfo) return false;
    return !progress.formBadges[formBadgeKey(gateInfo.afterLevel, gateInfo.kind)];
  };

  // Highlight the drill blocking the soonest drill-gated mission the player can unlock.
  const highlightedDrill = (() => {
    if (demo || progress.track !== "retrain") return null;
    for (const level of LEVELS) {
      if (!stageLocked(level.id)) continue;
      const gateInfo = drillGateFor(level.id);
      if (!gateInfo) continue;
      if (progress.unlockedLevel >= gateInfo.afterLevel) return gateInfo.kind;
    }
    return null;
  })();

  return (
    <section className={styles.hub}>
      {showRetrainIntro && <RetrainIntro onDone={onDismissRetrainIntro} />}
      <header className={styles.hero}>
        <p className={styles.brand}>AxiType</p>
        <p className={styles.tag}>Train touch typing. Chase the combo.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => onPlayLevel(continueId)}>
            Continue · Mission {continueId}
          </button>
          <button type="button" className={styles.secondary} onClick={() => onPractice()}>
            Practice
          </button>
          <button
            type="button"
            className={styles.daily}
            onClick={onDaily}
            title="One shared prompt for today — chase your local best"
          >
            Daily · {formatDailyLabel(dateKey)}
            {dailyBest ? ` · best ${dailyBest.wpm}` : ""}
          </button>
          <button type="button" className={styles.secondary} onClick={() => onPractice(60)}>
            60s sprint
          </button>
          <button type="button" className={styles.secondary} onClick={() => onPractice(90)}>
            90s sprint
          </button>
          <button
            type="button"
            className={styles.focus}
            disabled={!focusOpen}
            onClick={onFocus}
            title={
              focusOpen
                ? "Reads your stats, drills weak fingers/zones to 100% accuracy, then builds speed"
                : `Unlocks at Mission ${FOCUS_UNLOCK_LEVEL}`
            }
          >
            Focus
            {focusPreview ? ` · ${focusPreview}` : ""}
          </button>
          <button
            type="button"
            className={styles.gauntlet}
            disabled={!gauntletOpen}
            onClick={onGauntlet}
            title={
              gauntletOpen
                ? "Endless waves — survive as long as you can"
                : `Unlocks at Mission ${GAUNTLET_UNLOCK_LEVEL}`
            }
          >
            Gauntlet
            {progress.gauntletBest ? ` · best ${progress.gauntletBest.wavesCleared}` : ""}
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

      {showExplainer ? (
        <div className={styles.explainer}>
          <p>
            <strong>Learn</strong> — calmer coaching, {accuracyGate("learn")}% accuracy to unlock,
            Form Coach optional.
          </p>
          <p>
            <strong>Retrain</strong> — habit-breaking path: home check, pace gates, mandatory drills
            between stages, {accuracyGate("retrain")}% accuracy gate.
          </p>
          <button type="button" className={styles.explainerDismiss} onClick={onDismissTrackExplainer}>
            Got it
          </button>
        </div>
      ) : (
        <p className={styles.trackHint}>
          {progress.track === "retrain"
            ? "Form first. Stronger coaching and mandatory drills between stages."
            : "New typists — calmer arena after early missions."}
        </p>
      )}

      <p className={styles.legend}>
        ★★ {gate}%+ unlocks the next mission · ★★★ hits that level’s WPM target with no peek
        {progress.track === "retrain" ? " · Retrain also requires Form drills between stages" : ""}
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
        <label>
          <input type="checkbox" checked={demo} onChange={onToggleDemoMode} />
          Demo mode
        </label>
      </div>

      {demo && (
        <p className={styles.demoBanner}>
          Demo mode — all missions and drills are open. Round results won&apos;t save progress.
        </p>
      )}

      <ol className={styles.lane}>
        {LEVELS.map((level) => {
          const progressLocked = !demo && level.id > progress.unlockedLevel;
          const drillLocked = stageLocked(level.id);
          const locked = progressLocked || drillLocked;
          const stars = progress.levelStars[level.id] ?? 0;
          const badge =
            level.unlockDrill &&
            progress.formBadges[formBadgeKey(level.id, level.unlockDrill)];
          const drillGate = drillGateFor(level.id);
          const showDrillHint =
            drillLocked &&
            drillGate &&
            highlightedDrill === drillGate.kind &&
            progress.unlockedLevel >= drillGate.afterLevel;
          const showProgressHint =
            progressLocked &&
            !drillLocked &&
            level.id === progress.unlockedLevel + 1;
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
                  <span className={styles.titleRow}>
                    <strong>{level.title}</strong>
                    <span className={styles.stars}>{starsLabel(stars)}</span>
                    {badge && <span className={styles.badge}>Form</span>}
                  </span>
                  {showDrillHint && drillGate && (
                    <span className={styles.lockHint}>
                      Complete <strong>{drillGate.title}</strong> drill to unlock
                    </span>
                  )}
                  {showProgressHint && (
                    <span className={styles.lockHint}>
                      Earn ★★ ({gate}%+) on Mission {progress.unlockedLevel} to unlock
                    </span>
                  )}
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
            const unlocked = demo || progress.unlockedLevel >= d.afterLevel;
            const earned = progress.formBadges[formBadgeKey(d.afterLevel, d.kind)];
            const needed = highlightedDrill === d.kind;
            return (
              <button
                key={d.kind}
                type="button"
                className={`${styles.drill} ${needed ? styles.drillNeeded : ""}`}
                disabled={!unlocked}
                onClick={() => onDrill(d.kind, d.afterLevel)}
              >
                <strong>
                  {d.title} {earned ? "✓" : ""}
                  {needed && !earned ? " · required" : ""}
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
