import { useEffect, useMemo, useState } from "react";
import {
  missCountsFromEvents,
  suggestDrill,
  topMissedKeys,
} from "../game/drills";
import { accuracyGate, getLevel, type DrillKind, type Track } from "../game/levels";
import { explainStars } from "../game/scoring";
import type { EngineSnapshot } from "../game/engine";
import { LiveWpmChart } from "./charts/LiveWpmChart";
import styles from "./Results.module.css";

interface ResultsProps {
  title: string;
  snapshot: EngineSnapshot;
  levelId: number | "practice" | "drill";
  drill?: DrillKind;
  track: Track;
  stars: number;
  unlockedNext: boolean;
  nextLevelId: number | null;
  demoMode?: boolean;
  unlockedLevel: number;
  keyEvents: { key: string; ms: number; hit: boolean }[];
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
  onRetry,
  onNext,
  onHub,
  returnToLevelId = null,
  onReturnToMission,
  onSuggestedDrill,
}: ResultsProps) {
  const [showStarRules, setShowStarRules] = useState(false);
  const completed = snapshot.finished && !snapshot.timedOut;
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
    !completed || snapshot.timedOut
      ? "Round over"
      : canReturnToMission && completed
        ? "Drill done"
        : unlockedEnough
          ? "Lane cleared"
          : "Round over";

  const statusLine = (() => {
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
    (unlockedNext && !demoMode) || (canReturnToMission && completed)
      ? styles.statusGood
      : styles.statusHint;

  const gate = accuracyGate(track);
  const accuracyBelowGate = isMission && snapshot.accuracy < gate;
  const showCoach = topMisses.length > 0 || Boolean(drillSuggestion);

  return (
    <section className={styles.wrap}>
      <header className={styles.hero}>
        <p className={styles.kicker}>{kicker}</p>
        <h1>{title}</h1>
        <p className={styles.stars}>
          {"★".repeat(displayStars)}
          {"☆".repeat(Math.max(0, 3 - displayStars))}
        </p>
        {statusLine && <p className={statusTone}>{statusLine}</p>}
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
              Retry <span className={styles.kbd}>Space</span>
            </button>
            <button type="button" className={styles.ghost} onClick={onHub}>
              Hub
            </button>
          </>
        )}
      </div>

      {showCoach && (
        <div className={styles.coach}>
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
          {drillSuggestion && onSuggestedDrill && (
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
