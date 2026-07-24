import { FINGERS, fingerForKey, keysForFinger, type FingerId } from "./fingers";
import { aggregateMissCounts, type KeyStatMap, type ProgressState } from "../lib/storage";
import { weakestTypingFinger } from "./drills";
import {
  buildSessionPrompt,
  generateAlternatingDrill,
  generateOneFingerDrill,
  promptModeForPractice,
} from "./prompts";
import { allowedChars } from "./keyBias";

export type PracticeDurationId =
  | "short"
  | "long"
  | "sprint60"
  | "sprint90"
  | "sprint120"
  | "sprint180"
  | "sprint300";

export type PracticeFocusId =
  | "all"
  | "weak"
  | "homeRow"
  | "topRow"
  | "bottomRow"
  | "leftHand"
  | "rightHand"
  | "alternating"
  | "finger";

export interface PracticeConfig {
  duration: PracticeDurationId;
  focus: PracticeFocusId;
  /** Required when focus is `finger`. */
  finger?: FingerId;
}

export interface PracticeDurationOption {
  id: PracticeDurationId;
  label: string;
  timedSeconds?: number;
  targetLength: number;
}

export const PRACTICE_DURATION_OPTIONS: PracticeDurationOption[] = [
  { id: "short", label: "Short", targetLength: 80 },
  { id: "long", label: "Long", targetLength: 140 },
  { id: "sprint60", label: "60s", timedSeconds: 60, targetLength: 200 },
  { id: "sprint90", label: "90s", timedSeconds: 90, targetLength: 220 },
  { id: "sprint120", label: "2 min", timedSeconds: 120, targetLength: 240 },
  { id: "sprint180", label: "3 min", timedSeconds: 180, targetLength: 260 },
  { id: "sprint300", label: "5 min", timedSeconds: 300, targetLength: 300 },
];

export const PRACTICE_FOCUS_OPTIONS: { id: PracticeFocusId; label: string; hint: string }[] = [
  { id: "all", label: "All unlocked", hint: "Full charset from your campaign progress" },
  { id: "weak", label: "Weak finger", hint: "Your most-missed finger zone from recent rounds" },
  { id: "homeRow", label: "Home row", hint: "asdf jkl;" },
  { id: "topRow", label: "Top row", hint: "qwerty…" },
  { id: "bottomRow", label: "Bottom row", hint: "zxcv…" },
  { id: "leftHand", label: "Left hand", hint: "Left-hand keys only" },
  { id: "rightHand", label: "Right hand", hint: "Right-hand keys only" },
  { id: "alternating", label: "Alternating hands", hint: "Left ↔ right pairs" },
  { id: "finger", label: "One finger", hint: "Pick a finger zone" },
];

export const PRACTICE_FINGER_OPTIONS = (
  ["LP", "LR", "LM", "LI", "RI", "RM", "RR", "RP"] as FingerId[]
).map((id) => ({ id, label: FINGERS[id].label }));

export const DEFAULT_PRACTICE_CONFIG: PracticeConfig = {
  duration: "short",
  focus: "all",
};

const ROW_CHARSET: Record<Exclude<PracticeFocusId, "all" | "weak" | "finger" | "alternating">, string> = {
  homeRow: "asdfjkl; ",
  topRow: "qwertyuiop ",
  bottomRow: "zxcvbnm ",
  leftHand: "",
  rightHand: "",
};

export function practiceDurationOption(id: PracticeDurationId): PracticeDurationOption {
  return PRACTICE_DURATION_OPTIONS.find((d) => d.id === id) ?? PRACTICE_DURATION_OPTIONS[0];
}

/** True when miss map has at least one letter-key miss (not space-only). */
export function hasLetterMisses(missCounts: Record<string, number>): boolean {
  return Object.entries(missCounts).some(([key, count]) => count > 0 && /[a-z;]/.test(key));
}

/** Recent rounds first; fall back to lifetime when recent window is empty. */
export function practiceMissCounts(progress: ProgressState): Record<string, number> {
  const recent = aggregateMissCounts(progress, "recent12");
  if (hasLetterMisses(recent)) return recent;
  return progress.missCounts;
}

function rehabFinger(id: FingerId): FingerId {
  return id === "LT" || id === "RT" ? "LI" : id;
}

function uniqueCharset(chars: string): string {
  const seen = new Set<string>();
  let out = "";
  for (const ch of chars) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    out += ch;
  }
  return out;
}

function intersectCharsets(a: string, b: string): string {
  const allowed = new Set(a.split(""));
  return uniqueCharset([...b].filter((ch) => allowed.has(ch)).join(""));
}

export interface WeakFingerPracticeTarget {
  label: string;
  sampleKeys: string;
}

/** Hint for Weak finger focus when miss data exists; null on cold start. */
export function weakFingerPracticeTarget(
  unlockedKeys: string,
  missCounts: Record<string, number>,
): WeakFingerPracticeTarget | null {
  if (!hasLetterMisses(missCounts)) return null;
  const finger = rehabFinger(weakestTypingFinger(missCounts));
  const keys = intersectCharsets(unlockedKeys, keysForFinger(finger).join(""));
  const letters = keys.replace(/ /g, "");
  if (letters.length < 2) return null;
  return {
    label: FINGERS[finger].label,
    sampleKeys: letters.slice(0, 8).split("").join(" "),
  };
}

export function keysForPracticeFocus(
  unlockedKeys: string,
  focus: PracticeFocusId,
  missCounts: Record<string, number>,
  finger: FingerId = "LI",
): { keys: string; lockFinger?: FingerId } {
  if (focus === "all") {
    return { keys: unlockedKeys };
  }

  if (focus === "weak") {
    const zone = rehabFinger(weakestTypingFinger(missCounts));
    const keys = intersectCharsets(unlockedKeys, keysForFinger(zone).join(""));
    if (keys.replace(/ /g, "").length >= 2) {
      return { keys };
    }
    return { keys: unlockedKeys };
  }

  if (focus === "finger") {
    const target = rehabFinger(finger);
    const keys = intersectCharsets(unlockedKeys, keysForFinger(target).join(""));
    return { keys, lockFinger: target };
  }

  if (focus === "alternating") {
    return { keys: unlockedKeys };
  }

  if (focus === "leftHand" || focus === "rightHand") {
    const hand = focus === "leftHand" ? "left" : "right";
    const filtered = allowedChars(unlockedKeys)
      .filter((ch) => ch === " " || fingerForKey(ch).hand === hand)
      .join("");
    const keys = uniqueCharset(filtered);
    return { keys: keys || unlockedKeys };
  }

  const rowPool = ROW_CHARSET[focus];
  const keys = intersectCharsets(unlockedKeys, rowPool);
  return { keys };
}

export function practiceFocusLabel(config: PracticeConfig): string {
  const opt = PRACTICE_FOCUS_OPTIONS.find((f) => f.id === config.focus);
  if (config.focus === "finger" && config.finger) {
    return FINGERS[config.finger].label;
  }
  return opt?.label ?? "Practice";
}

export function practiceTitle(config: PracticeConfig): string {
  const dur = practiceDurationOption(config.duration);
  const focus = practiceFocusLabel(config);
  if (dur.timedSeconds) {
    return `Practice · ${dur.label} · ${focus}`;
  }
  return `Practice · ${focus}`;
}

export interface PracticeBuildResult {
  prompt: string;
  keys: string;
  lockFinger?: FingerId;
  title: string;
  timedSeconds?: number;
}

export function buildPracticeSession(
  config: PracticeConfig,
  unlockedKeys: string,
  stats: KeyStatMap | undefined,
  missCounts: Record<string, number>,
  lengthScale = 1,
): { ok: true; result: PracticeBuildResult } | { ok: false; error: string } {
  const duration = practiceDurationOption(config.duration);
  const targetLength = Math.max(24, Math.round(duration.targetLength * lengthScale));
  const finger = config.finger ?? "LI";
  const { keys, lockFinger } = keysForPracticeFocus(
    unlockedKeys,
    config.focus,
    missCounts,
    finger,
  );

  if (keys.replace(/ /g, "").length < 2) {
    return {
      ok: false,
      error: "Not enough unlocked keys for this focus — unlock more missions or pick a broader focus.",
    };
  }

  let prompt: string;
  if (config.focus === "alternating") {
    prompt = generateAlternatingDrill(keys, targetLength, stats);
  } else if (config.focus === "finger" && lockFinger) {
    prompt = generateOneFingerDrill(lockFinger, targetLength, stats);
  } else {
    prompt = buildSessionPrompt({
      mode: promptModeForPractice(keys),
      keys,
      targetLength,
      stats,
      preferAlternating: config.focus === "weak" || config.focus === "all",
    });
  }

  return {
    ok: true,
    result: {
      prompt,
      keys,
      lockFinger: config.focus === "finger" ? lockFinger : undefined,
      title: practiceTitle(config),
      timedSeconds: duration.timedSeconds,
    },
  };
}
