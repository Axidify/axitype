import { useEffect, useMemo, useState } from "react";
import {
  missCountsFromEvents,
  suggestDrill,
  topMissedKeys,
} from "../game/drills";
import { formatDailyLabel, type DailyBest } from "../game/daily";
import { accuracyGate, getLevel, type DrillKind, type Track } from "../game/levels";
import { gauntletAccuracyForWave } from "../game/gauntlet";
import { explainStars } from "../game/scoring";
import type { EngineSnapshot } from "../game/engine";
import type { GauntletBest } from "../lib/storage";
import { LiveWpmChart } from "./charts/LiveWpmChart";
import styles from "./Results.module.css";

interface ResultsProps {
  title: string;
  snapshot: EngineSnapshot;
  levelId: number | "practice" | "drill" | "gauntlet" | "focus" | "daily";
  drill?: DrillKind;
  track: Track;
  stars: number;
  unlockedNext: boolean;
  nextLevelId: number | null;
  demoMode?: boolean;
  unlockedLevel: number;
  keyEvents: { key: string; ms: number; hit: boolean }[];
  gauntletSummary?: {
    wavesCleared: number;
    totalScore: number;
    failedWave: number;
    newBest: boolean;
  } | null;
  gauntletBest?: GauntletBest;
  focusSummary?: {
    rounds: number;
    accuracyRounds: number;
    speedRounds: number;
    reason: string;
    focusTitle: string;
    fingerLabel: string;
    zone: string;
    lastAccuracy: number;
    lastWpm: number;
    targetWpm: number;
    lastFocusMisses: number;
  } | null;
  dailySummary?: {
    date: string;
    wpm: number;
    accuracy: number;
    score: number;
    completed: boolean;
    isNewBest: boolean;
    previousBest: DailyBest | null;
  } | null;
  onRetry: () => void;
  onNext: (levelId: number) => void;
  onHub: () => void;
  /** Mission the player came from (rehab drill from Results). */
  returnToLevelId?: number | null;
  onReturnToMission?: (levelId: number) => void;
  onSuggestedDrill?: (
    kind: DrillKind,
    afterLevel: number,
    missCounts: Record<string, number>,
  ) => void;
}

export function Results({
  title,
  snapshot,
  levelId,
  track,
  stars,
  unlockedNext,
  nextLevelId,
  demoMode,
  unlockedLevel,
  keyEvents,
  gauntletSummary = null,
  gauntletBest,
  focusSummary = null,
  dailySummary = null,
  onRetry,
  onNext,
  onHub,
  returnToLevelId = null,
  onReturnToMission,
  onSuggestedDrill,
}: ResultsProps) {
  const [showStarRules, setShowStarRules] = useState(false);
  const completed = snapshot.finished && !snapshot.timedOut;
  const isGauntlet = levelId === "gauntlet" && gauntletSummary !== null;
  const isFocus = levelId === "focus" && focusSummary !== null;
  const isDaily = levelId === "daily" && dailySummary !== null;
  const level = typeof levelId === "number" ? getLevel(levelId) : null;
  const isMission = level !== null;
  const canAdvance = nextLevelId !== null;
  const canReturnToMission =
    levelId === "drill" && returnToLevelId != null && Boolean(onReturnToMission);
  const returnMission = canReturnToMission ? getLevel(returnToLevelId) : null;

  const breakdown = isMission
    ? explainStars(
        completed,
        snapshot.accuracy,
        snapshot.wpm,
        level,
        track,
        snapshot.peeked,
        snapshot.timedOut,
      )
    : null;

  const roundMisses = missCountsFromEvents(keyEvents);
  const topMisses = topMissedKeys(roundMisses, 3);
  const drillSuggestion = useMemo(
    () => suggestDrill(roundMisses, keyEvents, unlockedLevel, demoMode),
    [roundMisses, keyEvents, unlockedLevel, demoMode],
  );
  const gauntletWaveGate =
    isGauntlet && gauntletSummary
      ? gauntletAccuracyForWave(gauntletSummary.failedWave, track)
      : null;
  const gauntletFocus = useMemo(() => {
    if (!isGauntlet || !gauntletSummary || gauntletWaveGate === null) return null;
    if (!completed || snapshot.timedOut) {
      return "Finish the wave before time runs out — incomplete prompts don't count.";
    }
    if (snapshot.accuracy < gauntletWaveGate) {
      const gap = gauntletWaveGate - snapshot.accuracy;
      const gapLabel = Number.isInteger(gap) ? `${gap}` : gap.toFixed(1);
      return `You were ${gapLabel} points below the ${gauntletWaveGate}% accuracy bar for wave ${gauntletSummary.failedWave}.`;
    }
    return null;
  }, [isGauntlet, gauntletSummary, gauntletWaveGate, completed, snapshot.timedOut, snapshot.accuracy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onHub();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHub]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      e.preventDefault();
      if (canAdvance) onNext(nextLevelId);
      else if (canReturnToMission && returnToLevelId != null) onReturnToMission?.(returnToLevelId);
      else onRetry();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canAdvance, canReturnToMission, nextLevelId, onNext, onRetry, onReturnToMission, returnToLevelId]);

  const displayStars = breakdown?.stars ?? stars;
  const unlockedEnough = displayStars >= 2;
  const kicker =
    isDaily
      ? dailySummary.isNewBest
        ? "New daily best"
        : "Daily challenge"
      : isFocus
      ? "Zone cleared"
      : isGauntlet
      ? gauntletSummary.newBest
        ? "New best run"
        : "Gauntlet over"
      : !completed || snapshot.timedOut
        ? "Round over"
        : canReturnToMission && completed
          ? "Drill done"
          : unlockedEnough
            ? "Lane cleared"
            : "Round over";

  const statusLine = (() => {
    if (isDaily && dailySummary) {
      if (demoMode) return "Demo run — daily best not saved";
      if (!dailySummary.completed) {
        return "Finish the full prompt to lock in a daily best.";
      }
      if (dailySummary.isNewBest) {
        return dailySummary.previousBest
          ? `Beat today's best — was ${dailySummary.previousBest.wpm} WPM.`
          : `First clear for ${formatDailyLabel(dailySummary.date)}.`;
      }
      if (dailySummary.previousBest) {
        return `Today's best stays ${dailySummary.previousBest.wpm} WPM · ${dailySummary.previousBest.accuracy}% — try again anytime.`;
      }
      return `Logged for ${formatDailyLabel(dailySummary.date)}.`;
    }
    if (isFocus && focusSummary) {
      if (demoMode) return "Demo session — progress not saved";
      return `Nailed ${focusSummary.fingerLabel} at ${focusSummary.lastAccuracy}% accuracy, then hit ${focusSummary.lastWpm} WPM (target ${focusSummary.targetWpm}).`;
    }
    if (isGauntlet && gauntletSummary) {
      const gate = gauntletAccuracyForWave(gauntletSummary.failedWave, track);
      if (demoMode) return "Demo run — best not saved";
      if (gauntletSummary.newBest) return "Personal best saved";
      if (!completed || snapshot.timedOut) {
        return `Wave ${gauntletSummary.failedWave} timed out — need ${gate}%+ accuracy to continue.`;
      }
      return `Wave ${gauntletSummary.failedWave} fell short — need ${gate}%+ accuracy to continue.`;
    }
    if (demoMode) return "Demo run — progress not saved";
    if (unlockedNext) return "Next mission unlocked";
    if (snapshot.timedOut && levelId === "practice") {
      return "Time's up — stats reflect what you finished.";
    }
    if (canReturnToMission && returnMission && completed) {
      return `Ready to retry ${returnMission.title}.`;
    }
    if (breakdown?.nextHint) return breakdown.nextHint;
    return null;
  })();

  const statusTone =
    (unlockedNext && !demoMode) ||
    (canReturnToMission && completed) ||
    isFocus ||
    (isDaily && dailySummary?.isNewBest) ||
    (isGauntlet && gauntletSummary?.newBest)
      ? styles.statusGood
      : styles.statusHint;

  const gate = accuracyGate(track);
  const accuracyBelowGate =
    (isMission && snapshot.accuracy < gate) ||
    (isGauntlet && gauntletWaveGate !== null && snapshot.accuracy < gauntletWaveGate);
  const showCoach =
    isFocus ||
    topMisses.length > 0 ||
    Boolean(drillSuggestion) ||
    Boolean(gauntletFocus);

  return (
    <section className={styles.wrap}>
      <header className={styles.hero}>
        <p className={styles.kicker}>{kicker}</p>
        <h1>{title}</h1>
        {isGauntlet && gauntletSummary ? (
          <p className={styles.gauntletHero}>
            <strong>{gauntletSummary.wavesCleared}</strong> waves cleared ·{" "}
            {gauntletSummary.totalScore.toLocaleString()} run score
          </p>
        ) : isFocus && focusSummary ? (
          <p className={styles.gauntletHero}>
            <strong>{focusSummary.fingerLabel}</strong> · {focusSummary.accuracyRounds} accuracy
            {focusSummary.accuracyRounds === 1 ? " round" : " rounds"} → {focusSummary.speedRounds}{" "}
            speed {focusSummary.speedRounds === 1 ? "round" : "rounds"}
          </p>
        ) : isDaily && dailySummary ? (
          <p className={styles.gauntletHero}>
            <strong>{dailySummary.wpm}</strong> WPM · {dailySummary.accuracy}% ·{" "}
            {dailySummary.score.toLocaleString()} score
          </p>
        ) : (
          <p className={styles.stars}>
            {"★".repeat(displayStars)}
            {"☆".repeat(Math.max(0, 3 - displayStars))}
          </p>
        )}
        {statusLine && <p className={statusTone}>{statusLine}</p>}
        {isGauntlet && gauntletBest && !demoMode && (
          <p className={styles.gauntletBest}>
            Best: {gauntletBest.wavesCleared} waves · {gauntletBest.totalScore.toLocaleString()} score
          </p>
        )}
      </header>

      <div className={styles.stats}>
        <div>
          <span>Score</span>
          <strong>{snapshot.score}</strong>
        </div>
        <div>
          <span>WPM</span>
          <strong>{snapshot.wpm}</strong>
        </div>
        <div className={accuracyBelowGate ? styles.statWarn : undefined}>
          <span>Accuracy</span>
          <strong>{snapshot.accuracy}%</strong>
        </div>
      </div>

      <div className={styles.actions}>
        {canAdvance ? (
          <>
            <button type="button" className={styles.primary} onClick={() => onNext(nextLevelId)}>
              Next mission <span className={styles.kbd}>Space</span>
            </button>
            <button type="button" className={styles.secondary} onClick={onRetry}>
              Retry
            </button>
            <button type="button" className={styles.ghost} onClick={onHub}>
              Hub
            </button>
          </>
        ) : canReturnToMission && returnMission ? (
          <>
            <button
              type="button"
              className={styles.primary}
              onClick={() => onReturnToMission?.(returnToLevelId)}
            >
              Retry {returnMission.title} <span className={styles.kbd}>Space</span>
            </button>
            <button type="button" className={styles.secondary} onClick={onRetry}>
              Retry drill
            </button>
            <button type="button" className={styles.ghost} onClick={onHub}>
              Hub
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.primary} onClick={onRetry}>
              {isGauntlet
                ? "Run again"
                : isFocus
                  ? "Train again"
                  : isDaily
                    ? "Try again"
                    : "Retry"}{" "}
              <span className={styles.kbd}>Space</span>
            </button>
            <button type="button" className={styles.ghost} onClick={onHub}>
              Hub
            </button>
          </>
        )}
      </div>

      {showCoach && (
        <div className={styles.coach}>
          {(isGauntlet || isFocus) && (
            <h2 className={styles.coachTitle}>
              {isFocus ? "What you drilled" : "What to work on"}
            </h2>
          )}
          {isFocus && focusSummary && (
            <p className={styles.gauntletFocus}>{focusSummary.reason}</p>
          )}
          {gauntletFocus && <p className={styles.gauntletFocus}>{gauntletFocus}</p>}
          {topMisses.length > 0 && (
            <div className={styles.missRow}>
              <span className={styles.missLabel}>Missed</span>
              <ul className={styles.missList}>
                {topMisses.map((m) => (
                  <li key={m.key}>
                    <kbd>{m.key === " " ? "␣" : m.key}</kbd>
                    <span>×{m.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {drillSuggestion && onSuggestedDrill && !isFocus && (
            <div className={styles.suggestRow}>
              <p className={styles.suggestReason}>{drillSuggestion.reason}</p>
              <button
                type="button"
                className={styles.drillCta}
                onClick={() =>
                  onSuggestedDrill(
                    drillSuggestion.kind,
                    drillSuggestion.afterLevel,
                    roundMisses,
                  )
                }
              >
                Try {drillSuggestion.title}
              </button>
            </div>
          )}
        </div>
      )}

      {breakdown && (
        <details
          className={styles.starDetails}
          open={showStarRules}
          onToggle={(e) => setShowStarRules((e.target as HTMLDetailsElement).open)}
        >
          <summary>How stars work</summary>
          <ul className={styles.reqs} aria-label="Star requirements">
            {breakdown.requirements.map((req) => (
              <li key={req.stars} className={req.met ? styles.reqMet : styles.reqMiss}>
                <span className={styles.reqStars}>{"★".repeat(req.stars)}</span>
                <span className={styles.reqBody}>
                  <strong>{req.label}</strong>
                  {req.detail && <span className={styles.reqDetail}>{req.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className={styles.chart}>
        <LiveWpmChart data={snapshot.wpmSamples} live={false} finalWpm={snapshot.wpm} />
      </div>
    </section>
  );
}
