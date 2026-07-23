import { getLevel } from "../game/levels";
import type { RoundHistoryEntry } from "./storage";

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Late-half average minus early-half average. Needs ≥4 samples. */
export function halfTrendDelta(values: number[]): number | null {
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const early = mean(values.slice(0, mid));
  const late = mean(values.slice(mid));
  if (early == null || late == null) return null;
  return late - early;
}

export function roundShortLabel(entry: RoundHistoryEntry): string {
  if (typeof entry.levelId === "number") return `M${entry.levelId}`;
  if (entry.levelId === "practice") return "P";
  if (entry.levelId === "drill") return "D";
  if (entry.levelId === "gauntlet") return "G";
  if (entry.levelId === "focus") return "F";
  if (entry.levelId === "daily") return "Y";
  return "?";
}

export interface BestLevelRow {
  id: number;
  title: string;
  stars: number;
  wpm: number | null;
  accuracy: number | null;
  score: number | null;
}

export function bestLevelRows(
  bestByLevel: Record<number, { score: number; wpm: number; accuracy: number }>,
  levelStars: Record<number, number>,
  unlockedLevel: number,
): BestLevelRow[] {
  const maxId = Math.max(1, Math.min(unlockedLevel, 12));
  const rows: BestLevelRow[] = [];
  for (let id = 1; id <= maxId; id++) {
    const best = bestByLevel[id];
    rows.push({
      id,
      title: getLevel(id).title,
      stars: levelStars[id] ?? 0,
      wpm: best?.wpm ?? null,
      accuracy: best?.accuracy ?? null,
      score: best?.score ?? null,
    });
  }
  return rows;
}

export function formatTrendDelta(delta: number | null, unit: "wpm" | "accuracy"): string {
  if (delta == null) return "Need a few more rounds for a trend";
  const rounded = unit === "accuracy" ? Math.round(delta * 10) / 10 : Math.round(delta);
  if (Math.abs(rounded) < (unit === "accuracy" ? 0.5 : 1)) return "Holding steady";
  const sign = rounded > 0 ? "+" : "";
  const suffix = unit === "accuracy" ? " pts" : " WPM";
  return `${sign}${rounded}${suffix} vs earlier rounds`;
}
