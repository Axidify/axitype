import { useState } from "react";
import { fingerForKey } from "../game/fingers";
import { weakestTypingFinger } from "../game/drills";
import {
  aggregateMissCounts,
  missCountsToEntries,
  roundsForWindow,
  type MissStatsWindow,
  type ProgressState,
} from "../lib/storage";
import { MissedKeysHeatmap } from "./charts/MissedKeysHeatmap";
import { ProgressTrendChart } from "./charts/ProgressTrendChart";
import styles from "./Stats.module.css";

interface StatsProps {
  progress: ProgressState;
  onBack: () => void;
  onWeakFinger: (missCounts: Record<string, number>) => void;
}

const WINDOW_OPTIONS: { id: MissStatsWindow; label: string }[] = [
  { id: "recent12", label: "Last 12 rounds" },
  { id: "week", label: "Last 7 days" },
  { id: "all", label: "All time" },
];

export function Stats({ progress, onBack, onWeakFinger }: StatsProps) {
  const [window, setWindow] = useState<MissStatsWindow>("recent12");

  const rounds = roundsForWindow(progress.roundHistory, window);
  const wpm = rounds.map((r) => r.wpm);
  const labels = rounds.map((_, i) => `${i + 1}`);

  const missCounts = aggregateMissCounts(progress, window);
  const misses = missCountsToEntries(missCounts);

  const weak = weakestTypingFinger(missCounts);
  const weakLabel = fingerForKey(
    Object.keys(missCounts).find((k) => fingerForKey(k).id === weak) ?? "f",
  ).label;

  return (
    <section className={styles.wrap}>
      <header className={styles.top}>
        <button type="button" onClick={onBack}>
          Back
        </button>
        <h1>Stats</h1>
      </header>

      <p className={styles.note}>
        Weak zones are inferred from keys you miss — not which finger we saw.
      </p>

      <div className={styles.windowPicker} role="group" aria-label="Stats time range">
        {WINDOW_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={window === opt.id ? styles.windowActive : styles.windowBtn}
            onClick={() => setWindow(opt.id)}
            aria-pressed={window === opt.id}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {misses.length > 0 && (
        <div className={styles.ctaBox}>
          <p>
            Needs rehab: <strong>{weakLabel}</strong>
          </p>
          <button type="button" className={styles.cta} onClick={() => onWeakFinger(missCounts)}>
            Start Weak Finger drill
          </button>
        </div>
      )}

      <h2>Recent WPM</h2>
      <ProgressTrendChart wpm={wpm} labels={labels} />

      <h2>Most missed keys</h2>
      <MissedKeysHeatmap entries={misses} />
    </section>
  );
}
