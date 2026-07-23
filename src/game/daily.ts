import type { KeyStatMap } from "../lib/storage";
import { buildSessionPrompt, promptModeForPractice } from "./prompts";

export const DAILY_PROMPT_LENGTH = 110;

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Short hub/results label, e.g. "Jul 24". */
export function formatDailyLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Deterministic uint32 seed from a date key. */
export function dailySeed(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Run `fn` with a seeded Math.random so prompt builders stay deterministic. */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const rng = mulberry32(seed);
  const original = Math.random;
  Math.random = rng;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

/** Same prompt for a given date + charset (+ mild weak-key bias via stats). */
export function buildDailyPrompt(
  keys: string,
  stats: KeyStatMap | undefined,
  dateKey = localDateKey(),
): string {
  const mode = promptModeForPractice(keys);
  return withSeededRandom(dailySeed(dateKey), () =>
    buildSessionPrompt({
      mode,
      keys,
      targetLength: DAILY_PROMPT_LENGTH,
      stats,
      preferAlternating: true,
      preferShort: false,
    }),
  );
}

export interface DailyBest {
  date: string;
  wpm: number;
  accuracy: number;
  score: number;
  at: number;
  attempts: number;
}

export function isBetterDailyRun(
  candidate: { wpm: number; accuracy: number; score: number },
  previous: DailyBest | null | undefined,
): boolean {
  if (!previous) return true;
  if (candidate.score !== previous.score) return candidate.score > previous.score;
  if (candidate.wpm !== previous.wpm) return candidate.wpm > previous.wpm;
  return candidate.accuracy > previous.accuracy;
}

export function todaysDailyBest(
  dailyBest: DailyBest | undefined,
  dateKey = localDateKey(),
): DailyBest | null {
  if (!dailyBest || dailyBest.date !== dateKey) return null;
  return dailyBest;
}
