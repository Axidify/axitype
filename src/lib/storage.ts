import type { DrillKind, Track } from "../game/levels";
import type { DailyBest } from "../game/daily";

export type { DailyBest };

export interface KeyStat {
  hits: number;
  misses: number;
  meanLatencyMs: number;
}

export type KeyStatMap = Record<string, KeyStat>;

export type SessionLevelId = number | "practice" | "drill" | "gauntlet" | "focus" | "daily";

export interface RoundHistoryEntry {
  at: number;
  levelId: SessionLevelId;
  drill?: DrillKind;
  gauntletWave?: number;
  focusRound?: number;
  wpm: number;
  accuracy: number;
  score: number;
  stars: number;
  missCounts?: Record<string, number>;
}

export type MissStatsWindow = "recent12" | "week" | "all";

export interface GauntletBest {
  wavesCleared: number;
  totalScore: number;
  at: number;
}

export interface ProgressState {
  track: Track;
  unlockedLevel: number;
  levelStars: Record<number, number>;
  formBadges: Record<string, boolean>;
  bestByLevel: Record<number, { score: number; wpm: number; accuracy: number }>;
  gauntletBest?: GauntletBest;
  /** Best completed run for a calendar day (YYYY-MM-DD). */
  dailyBest?: DailyBest;
  roundHistory: RoundHistoryEntry[];
  missCounts: Record<string, number>;
  keyStats: KeyStatMap;
  coachPrefs: {
    formCoach: boolean;
    skipHomeAfter5: boolean;
    sound: boolean;
    seenTrackExplainer: boolean;
    seenRetrainIntro: boolean;
    demoMode: boolean;
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
      seenTrackExplainer: false,
      seenRetrainIntro: false,
      demoMode: false,
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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function roundsForWindow(
  roundHistory: RoundHistoryEntry[],
  window: MissStatsWindow,
  now = Date.now(),
): RoundHistoryEntry[] {
  if (window === "all") return roundHistory;
  if (window === "recent12") return roundHistory.slice(-12);
  return roundHistory.filter((round) => round.at >= now - WEEK_MS);
}

export function aggregateMissCounts(
  progress: ProgressState,
  window: MissStatsWindow,
  now = Date.now(),
): Record<string, number> {
  if (window === "all") return progress.missCounts;

  const out: Record<string, number> = {};
  for (const round of roundsForWindow(progress.roundHistory, window, now)) {
    if (!round.missCounts) continue;
    for (const [key, count] of Object.entries(round.missCounts)) {
      out[key] = (out[key] ?? 0) + count;
    }
  }
  return out;
}

export function missCountsToEntries(counts: Record<string, number>): { key: string; count: number }[] {
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}
