import { fingerForKey } from "../game/fingers";
import { weakestFinger } from "../game/drills";
import type { ProgressState } from "../lib/storage";
import { MissedKeysChart } from "./charts/MissedKeysChart";
import { ProgressTrendChart } from "./charts/ProgressTrendChart";
import styles from "./Stats.module.css";

interface StatsProps {
  progress: ProgressState;
  onBack: () => void;
  onWeakFinger: () => void;
}

export function Stats({ progress, onBack, onWeakFinger }: StatsProps) {
  const recent = progress.roundHistory.slice(-12);
  const wpm = recent.map((r) => r.wpm);
  const labels = recent.map((_, i) => `${i + 1}`);

  const misses = Object.entries(progress.missCounts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  const weak = weakestFinger(progress.missCounts);
  const weakLabel = fingerForKey(
    Object.keys(progress.missCounts).find((k) => fingerForKey(k).id === weak) ?? "f",
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

      {misses.length > 0 && (
        <div className={styles.ctaBox}>
          <p>
            Needs rehab: <strong>{weakLabel}</strong>
          </p>
          <button type="button" className={styles.cta} onClick={onWeakFinger}>
            Start Weak Finger drill
          </button>
        </div>
      )}

      <h2>Recent WPM</h2>
      <ProgressTrendChart wpm={wpm} labels={labels} />

      <h2>Most missed keys</h2>
      <MissedKeysChart entries={misses} />
    </section>
  );
}
