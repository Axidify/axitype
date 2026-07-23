import type { DrillKind, Track } from "../game/levels";
import { defaultProgress, type ProgressState } from "./storage";

export const PROGRESS_EXPORT_SCHEMA = "axitype.progress";
export const PROGRESS_EXPORT_VERSION = 1;

export interface ProgressExportFile {
  schema: typeof PROGRESS_EXPORT_SCHEMA;
  version: number;
  exportedAt: number;
  progress: ProgressState;
}

export type ProgressImportResult =
  | { ok: true; progress: ProgressState }
  | { ok: false; error: string };

const TRACKS = new Set<Track>(["learn", "retrain"]);
const DRILLS = new Set<DrillKind>([
  "homeReturn",
  "oneFinger",
  "alternatingHands",
  "weakFinger",
  "eyesUp",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asStringRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (typeof count === "number" && Number.isFinite(count)) out[key] = count;
  }
  return out;
}

function asBoolRecord(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  const out: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(value)) {
    if (typeof flag === "boolean") out[key] = flag;
  }
  return out;
}

function asNumberKeyedRecord(
  value: unknown,
): Record<number, { score: number; wpm: number; accuracy: number }> {
  if (!isRecord(value)) return {};
  const out: Record<number, { score: number; wpm: number; accuracy: number }> = {};
  for (const [key, entry] of Object.entries(value)) {
    const id = Number(key);
    if (!Number.isInteger(id) || !isRecord(entry)) continue;
    out[id] = {
      score: asNumber(entry.score, 0),
      wpm: asNumber(entry.wpm, 0),
      accuracy: asNumber(entry.accuracy, 0),
    };
  }
  return out;
}

function asLevelStars(value: unknown): Record<number, number> {
  if (!isRecord(value)) return {};
  const out: Record<number, number> = {};
  for (const [key, stars] of Object.entries(value)) {
    const id = Number(key);
    if (!Number.isInteger(id) || typeof stars !== "number" || !Number.isFinite(stars)) continue;
    out[id] = Math.max(0, Math.min(3, Math.round(stars)));
  }
  return out;
}

function normalizeRoundHistory(value: unknown): ProgressState["roundHistory"] {
  if (!Array.isArray(value)) return [];
  const out: ProgressState["roundHistory"] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const levelId = entry.levelId;
    const validLevel =
      (typeof levelId === "number" && Number.isInteger(levelId)) ||
      levelId === "practice" ||
      levelId === "drill" ||
      levelId === "gauntlet" ||
      levelId === "focus";
    if (!validLevel) continue;
    const drill = entry.drill;
    out.push({
      at: asNumber(entry.at, Date.now()),
      levelId: levelId as ProgressState["roundHistory"][number]["levelId"],
      drill: typeof drill === "string" && DRILLS.has(drill as DrillKind) ? (drill as DrillKind) : undefined,
      gauntletWave:
        typeof entry.gauntletWave === "number" ? entry.gauntletWave : undefined,
      focusRound: typeof entry.focusRound === "number" ? entry.focusRound : undefined,
      wpm: asNumber(entry.wpm, 0),
      accuracy: asNumber(entry.accuracy, 0),
      score: asNumber(entry.score, 0),
      stars: asNumber(entry.stars, 0),
      missCounts: entry.missCounts ? asStringRecord(entry.missCounts) : undefined,
    });
  }
  return out;
}

function normalizeKeyStats(value: unknown): ProgressState["keyStats"] {
  if (!isRecord(value)) return {};
  const out: ProgressState["keyStats"] = {};
  for (const [key, stat] of Object.entries(value)) {
    if (!isRecord(stat)) continue;
    out[key] = {
      hits: asNumber(stat.hits, 0),
      misses: asNumber(stat.misses, 0),
      meanLatencyMs: asNumber(stat.meanLatencyMs, 200),
    };
  }
  return out;
}

/** Merge unknown JSON into a safe ProgressState (same spirit as loadProgress). */
export function normalizeProgress(raw: unknown): ProgressState | null {
  if (!isRecord(raw)) return null;
  const defaults = defaultProgress();
  const track = raw.track;
  const coachPrefs = isRecord(raw.coachPrefs) ? raw.coachPrefs : {};

  return {
    track: typeof track === "string" && TRACKS.has(track as Track) ? (track as Track) : defaults.track,
    unlockedLevel: Math.max(1, Math.min(12, Math.round(asNumber(raw.unlockedLevel, 1)))),
    levelStars: asLevelStars(raw.levelStars),
    formBadges: asBoolRecord(raw.formBadges),
    bestByLevel: asNumberKeyedRecord(raw.bestByLevel),
    gauntletBest: isRecord(raw.gauntletBest)
      ? {
          wavesCleared: asNumber(raw.gauntletBest.wavesCleared, 0),
          totalScore: asNumber(raw.gauntletBest.totalScore, 0),
          at: asNumber(raw.gauntletBest.at, Date.now()),
        }
      : undefined,
    roundHistory: normalizeRoundHistory(raw.roundHistory),
    missCounts: asStringRecord(raw.missCounts),
    keyStats: normalizeKeyStats(raw.keyStats),
    coachPrefs: {
      formCoach: asBoolean(coachPrefs.formCoach, defaults.coachPrefs.formCoach),
      skipHomeAfter5: asBoolean(coachPrefs.skipHomeAfter5, defaults.coachPrefs.skipHomeAfter5),
      sound: asBoolean(coachPrefs.sound, defaults.coachPrefs.sound),
      seenTrackExplainer: asBoolean(
        coachPrefs.seenTrackExplainer,
        defaults.coachPrefs.seenTrackExplainer,
      ),
      seenRetrainIntro: asBoolean(
        coachPrefs.seenRetrainIntro,
        defaults.coachPrefs.seenRetrainIntro,
      ),
      demoMode: asBoolean(coachPrefs.demoMode, defaults.coachPrefs.demoMode),
    },
  };
}

export function buildProgressExport(progress: ProgressState, exportedAt = Date.now()): ProgressExportFile {
  return {
    schema: PROGRESS_EXPORT_SCHEMA,
    version: PROGRESS_EXPORT_VERSION,
    exportedAt,
    progress,
  };
}

export function serializeProgressExport(progress: ProgressState, exportedAt = Date.now()): string {
  return `${JSON.stringify(buildProgressExport(progress, exportedAt), null, 2)}\n`;
}

export function parseProgressImport(raw: string): ProgressImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  // Accept wrapped export or a bare progress object (legacy paste).
  let progressRaw: unknown = parsed;
  if (isRecord(parsed) && parsed.schema === PROGRESS_EXPORT_SCHEMA) {
    const version = asNumber(parsed.version, 0);
    if (version < 1 || version > PROGRESS_EXPORT_VERSION) {
      return { ok: false, error: `Unsupported backup version (${version}).` };
    }
    progressRaw = parsed.progress;
  }

  const progress = normalizeProgress(progressRaw);
  if (!progress) {
    return { ok: false, error: "Couldn't read progress data from that file." };
  }
  return { ok: true, progress };
}

export function progressExportFilename(exportedAt = Date.now()): string {
  const d = new Date(exportedAt);
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
  return `axitype-progress-${stamp}.json`;
}
