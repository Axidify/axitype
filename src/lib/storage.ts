import type { DrillKind, Track } from "../game/levels";

export interface KeyStat {
  hits: number;
  misses: number;
  meanLatencyMs: number;
}

export type KeyStatMap = Record<string, KeyStat>;

export interface RoundHistoryEntry {
  at: number;
  levelId: number | "practice" | "drill";
  drill?: DrillKind;
  wpm: number;
  accuracy: number;
  score: number;
  stars: number;
}

export interface ProgressState {
  track: Track;
  unlockedLevel: number;
  levelStars: Record<number, number>;
  formBadges: Record<string, boolean>;
  bestByLevel: Record<number, { score: number; wpm: number; accuracy: number }>;
  roundHistory: RoundHistoryEntry[];
  missCounts: Record<string, number>;
  keyStats: KeyStatMap;
  coachPrefs: {
    formCoach: boolean;
    skipHomeAfter5: boolean;
    sound: boolean;
  };
}

const STORAGE_KEY = "axitype.v1";
const LEGACY_STORAGE_KEY = "keylane.v1";

export function defaultProgress(): ProgressState {
  return {
    track: "learn",
    unlockedLevel: 1,
    levelStars: {},
    formBadges: {},
    bestByLevel: {},
    roundHistory: [],
    missCounts: {},
    keyStats: {},
    coachPrefs: {
      formCoach: true,
      skipHomeAfter5: false,
      sound: true,
    },
  };
}

export function loadProgress(): ProgressState {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) localStorage.setItem(STORAGE_KEY, raw);
    }
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return { ...defaultProgress(), ...parsed, coachPrefs: { ...defaultProgress().coachPrefs, ...parsed.coachPrefs } };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(state: ProgressState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateKeyStat(
  stats: KeyStatMap,
  key: string,
  hit: boolean,
  latencyMs: number,
): KeyStatMap {
  const prev = stats[key] ?? { hits: 0, misses: 0, meanLatencyMs: 200 };
  const next = { ...prev };
  if (hit) {
    next.hits += 1;
    const n = next.hits;
    next.meanLatencyMs = Math.round((prev.meanLatencyMs * (n - 1) + latencyMs) / n);
  } else {
    next.misses += 1;
  }
  return { ...stats, [key]: next };
}

export function formBadgeKey(levelId: number, drill: DrillKind): string {
  return `L${levelId}:${drill}`;
}
