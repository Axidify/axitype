import { fingerForKey } from "../../game/fingers";
import styles from "./MissedKeysHeatmap.module.css";

const ROWS = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

interface MissedKeysHeatmapProps {
  entries: { key: string; count: number }[];
}

function heatLevel(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return 0.2 + 0.8 * (count / max);
}

export function MissedKeysHeatmap({ entries }: MissedKeysHeatmapProps) {
  if (entries.length === 0) {
    return <p className={styles.empty}>No miss data yet.</p>;
  }

  const counts = Object.fromEntries(entries.map((e) => [e.key, e.count]));
  const max = Math.max(...entries.map((e) => e.count));

  function renderKey(key: string, className = "") {
    const count = counts[key] ?? counts[key.toLowerCase()] ?? 0;
    const level = heatLevel(count, max);
    const label = key === " " ? "space" : key;
    const zone = fingerForKey(key).cssVar;
    return (
      <span
        key={key}
        className={[styles.key, count > 0 ? styles.hot : "", className].filter(Boolean).join(" ")}
        style={{
          ["--zone" as string]: `var(${zone})`,
          ...(count > 0 ? { ["--heat" as string]: level } : {}),
        }}
        title={
          count > 0
            ? `${label}: ${count} miss${count === 1 ? "" : "es"} · ${fingerForKey(key).label}`
            : `${label} · ${fingerForKey(key).label}`
        }
      >
        {label}
        {count > 0 && <span className={styles.badge}>{count}</span>}
      </span>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.board}>
        {ROWS.map((row, ri) => (
          <div key={ri} className={styles.row} style={{ marginLeft: `${ri * 0.55}rem` }}>
            {row.map((key) => renderKey(key))}
          </div>
        ))}
        <div className={styles.row}>
          {renderKey(" ", styles.space)}
        </div>
      </div>
      <p className={styles.legend}>Brighter color = more misses · colors match finger zones</p>
    </div>
  );
}
