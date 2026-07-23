import { useEffect } from "react";
import { calcStars } from "../game/scoring";
import { getLevel, type DrillKind, type Track } from "../game/levels";
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
  onRetry: () => void;
  onNext: (levelId: number) => void;
  onHub: () => void;
}

export function Results({
  title,
  snapshot,
  levelId,
  track,
  stars,
  unlockedNext,
  nextLevelId,
  onRetry,
  onNext,
  onHub,
}: ResultsProps) {
  const completed = snapshot.finished && !snapshot.timedOut;
  const level = typeof levelId === "number" ? getLevel(levelId) : null;
  const computed =
    level && typeof levelId === "number"
      ? calcStars(
          completed,
          snapshot.accuracy,
          snapshot.wpm,
          level,
          track,
          snapshot.peeked,
        )
      : stars;

  useEffect(() => {
    if (nextLevelId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      e.preventDefault();
      onNext(nextLevelId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextLevelId, onNext]);

  return (
    <section className={styles.wrap}>
      <p className={styles.kicker}>{completed ? "Lane cleared" : "Round over"}</p>
      <h1>{title}</h1>
      <p className={styles.stars}>{"★".repeat(computed)}{"☆".repeat(Math.max(0, 3 - computed))}</p>
      {unlockedNext && <p className={styles.unlock}>Next mission unlocked</p>}
      {snapshot.peeked && <p className={styles.note}>Peek used — 3rd star gated</p>}

      <div className={styles.stats}>
        <div>
          <span>Score</span>
          <strong>{snapshot.score}</strong>
        </div>
        <div>
          <span>WPM</span>
          <strong>{snapshot.wpm}</strong>
        </div>
        <div>
          <span>Accuracy</span>
          <strong>{snapshot.accuracy}%</strong>
        </div>
      </div>

      <LiveWpmChart data={snapshot.wpmSamples} live={false} />

      <div className={styles.actions}>
        {nextLevelId !== null && (
          <button type="button" className={styles.primary} onClick={() => onNext(nextLevelId)}>
            Next mission <span className={styles.kbd}>Space</span>
          </button>
        )}
        <button type="button" className={styles.secondary} onClick={onRetry}>
          Retry
        </button>
        <button type="button" className={styles.secondary} onClick={onHub}>
          Hub
        </button>
      </div>
    </section>
  );
}
