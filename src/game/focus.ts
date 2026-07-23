import type { FingerId } from "./fingers";
import { FINGERS, fingerForKey, isHomeKey, keysForFinger } from "./fingers";
import {
  countReachMisses,
  getDrill,
  topMissedKeys,
  weakestTypingFinger,
} from "./drills";
import { getLevel, type DrillKind, type Track } from "./levels";
import { weaknessWeight, weakestKey } from "./keyBias";
import type { KeyStatMap } from "../lib/storage";
import {
  type FocusWordComplexity,
  generateFocusAlternatingWords,
  generateFocusFingerWords,
  generateFocusReachWords,
} from "./pseudoWords";

/** Minimum campaign mission cleared before Focus unlocks. */
export const FOCUS_UNLOCK_LEVEL = 3;
export const FOCUS_MAX_SPEED_TIER = 3;

const ACCURACY_LENGTH = 42;
const SPEED_LENGTH = 72;

export type FocusPhase = "accuracy" | "speed";
export type WeakZoneKind = "finger" | "reach" | "sameHand" | "slowKey";

export interface WeaknessProfile {
  zone: WeakZoneKind;
  finger?: FingerId;
  fingerLabel: string;
  reason: string;
  focusKeys: string[];
  severity: number;
}

export interface FocusPlan {
  kind: DrillKind;
  title: string;
  reason: string;
  zone: WeakZoneKind;
  fingerLabel: string;
  focusKeys: string[];
  /** Key to overweight in generated prompts. */
  weakKey?: string;
  lockFinger?: FingerId;
  eyesUp?: boolean;
}

export interface FocusRunState {
  round: number;
  phase: FocusPhase;
  plan: FocusPlan;
  targetWpm: number;
  speedTier: number;
  accuracyRounds: number;
  speedRounds: number;
}

export function isFocusUnlocked(unlockedLevel: number, demoMode: boolean): boolean {
  return demoMode || unlockedLevel >= FOCUS_UNLOCK_LEVEL;
}

function poolLetters(keys: string): string[] {
  return keys.split("").filter((c) => c !== " ");
}

function handMissTotals(missCounts: Record<string, number>): { left: number; right: number } {
  let left = 0;
  let right = 0;
  for (const [key, n] of Object.entries(missCounts)) {
    const hand = fingerForKey(key).hand;
    if (hand === "left") left += n;
    else if (hand === "right") right += n;
  }
  return { left, right };
}

function fingerWeaknessScores(
  missCounts: Record<string, number>,
  keyStats: KeyStatMap,
  keys: string,
): Partial<Record<FingerId, number>> {
  const pool = poolLetters(keys);
  const scores: Partial<Record<FingerId, number>> = {};

  for (const key of pool) {
    const finger = fingerForKey(key).id;
    if (finger === "LT" || finger === "RT") continue;

    const misses = missCounts[key] ?? 0;
    const stat = keyStats[key];
    const attempts = stat ? stat.hits + stat.misses : 0;
    const missRate = attempts > 0 ? stat!.misses / attempts : 0;
    const latency = stat ? Math.min(2, stat.meanLatencyMs / 350) : 0;
    const keyScore = misses * 2.5 + missRate * 6 + latency;

    scores[finger] = (scores[finger] ?? 0) + keyScore;
  }

  return scores;
}

function pickWeakestFinger(scores: Partial<Record<FingerId, number>>): FingerId | null {
  let best: FingerId | null = null;
  let max = 0;
  for (const [id, score] of Object.entries(scores) as [FingerId, number][]) {
    if (score > max) {
      max = score;
      best = id;
    }
  }
  return max > 0 ? best : null;
}

function fingerShare(missCounts: Record<string, number>, finger: FingerId): number {
  const total = Object.values(missCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let fingerTotal = 0;
  for (const [key, n] of Object.entries(missCounts)) {
    if (fingerForKey(key).id === finger) fingerTotal += n;
  }
  return fingerTotal / total;
}

function focusKeysForFinger(finger: FingerId, keys: string): string[] {
  const pool = new Set(poolLetters(keys));
  return keysForFinger(finger).filter((k) => pool.has(k));
}

function focusKeysForReach(keys: string, missCounts: Record<string, number>): string[] {
  const pool = poolLetters(keys);
  const reachMisses = Object.entries(missCounts)
    .filter(([k]) => pool.includes(k) && !isHomeKey(k))
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  if (reachMisses.length > 0) return reachMisses;
  const reach = pool.filter((k) => !isHomeKey(k));
  return reach.length > 0 ? reach : pool;
}

export function primaryFocusKey(
  plan: FocusPlan,
  missCounts: Record<string, number>,
): string | undefined {
  const ranked = [...plan.focusKeys].sort(
    (a, b) => (missCounts[b] ?? 0) - (missCounts[a] ?? 0),
  );
  return ranked[0];
}

/** Score collected play data and pick the weakest finger or habit zone. */
export function analyzeWeakness(
  missCounts: Record<string, number>,
  keyStats: KeyStatMap,
  keys: string,
): WeaknessProfile {
  const pool = poolLetters(keys);
  const totalMisses = Object.values(missCounts).reduce((a, b) => a + b, 0);
  const fingerScores = fingerWeaknessScores(missCounts, keyStats, keys);
  const weakFinger = pickWeakestFinger(fingerScores) ?? weakestTypingFinger(missCounts);
  const fingerLabel = FINGERS[weakFinger].label.toLowerCase();

  const { left, right } = handMissTotals(missCounts);
  const handTotal = left + right;
  const dominantHand = left >= right ? "left" : "right";
  const dominantShare = handTotal > 0 ? Math.max(left, right) / handTotal : 0;

  const reachMisses = countReachMisses(missCounts);

  if (handTotal >= 4 && dominantShare >= 0.72) {
    return {
      zone: "sameHand",
      finger: weakFinger,
      fingerLabel,
      reason: `Most misses land on your ${dominantHand} hand — alternate left ↔ right until it's clean.`,
      focusKeys: pool,
      severity: dominantShare,
    };
  }

  if (totalMisses > 0 && reachMisses / totalMisses >= 0.45) {
    return {
      zone: "reach",
      finger: weakFinger,
      fingerLabel,
      reason: "Reach keys are your weak zone — return to home after every stretch.",
      focusKeys: focusKeysForReach(keys, missCounts),
      severity: reachMisses,
    };
  }

  if (totalMisses > 0 && fingerShare(missCounts, weakFinger) >= 0.35) {
    const top = topMissedKeys(missCounts, 1)[0];
    const sample = top?.key ?? FINGERS[weakFinger].home;
    return {
      zone: "finger",
      finger: weakFinger,
      fingerLabel,
      reason: `Misses cluster on ${fingerLabel} (${sample === " " ? "space" : sample}) — own that finger zone first.`,
      focusKeys: focusKeysForFinger(weakFinger, keys),
      severity: fingerScores[weakFinger] ?? fingerShare(missCounts, weakFinger),
    };
  }

  const slowKey = weakestKey(pool, keyStats);
  if (slowKey) {
    const finger = fingerForKey(slowKey).id;
    return {
      zone: "slowKey",
      finger,
      fingerLabel: FINGERS[finger].label.toLowerCase(),
      reason: `${slowKey} is your slowest key (${Math.round(keyStats[slowKey]?.meanLatencyMs ?? 0)}ms avg) — build accuracy, then speed.`,
      focusKeys: focusKeysForFinger(finger, keys),
      severity: weaknessWeight(slowKey, keyStats),
    };
  }

  const top = topMissedKeys(missCounts, 1)[0];
  if (top) {
    const finger = fingerForKey(top.key).id;
    return {
      zone: "finger",
      finger,
      fingerLabel: FINGERS[finger].label.toLowerCase(),
      reason: `Most misses on ${top.key === " " ? "space" : top.key} — drill ${FINGERS[finger].label.toLowerCase()} until it's clean.`,
      focusKeys: focusKeysForFinger(finger, keys),
      severity: top.count,
    };
  }

  return {
    zone: "finger",
    finger: weakFinger,
    fingerLabel,
    reason: `No clear hot spot yet — start with ${fingerLabel} accuracy on your unlocked keys.`,
    focusKeys: focusKeysForFinger(weakFinger, keys).length > 0 ? focusKeysForFinger(weakFinger, keys) : pool,
    severity: 1,
  };
}

function drillKindForZone(zone: WeakZoneKind): DrillKind {
  switch (zone) {
    case "sameHand":
      return "alternatingHands";
    case "reach":
      return "homeReturn";
    case "slowKey":
    case "finger":
    default:
      return "oneFinger";
  }
}

export function buildFocusPlan(
  missCounts: Record<string, number>,
  keyStats: KeyStatMap,
  keys: string,
): FocusPlan {
  const profile = analyzeWeakness(missCounts, keyStats, keys);
  const kind = drillKindForZone(profile.zone);
  const def = getDrill(kind);
  const weakKey = primaryFocusKey(
    {
      kind,
      title: def.title,
      reason: profile.reason,
      zone: profile.zone,
      fingerLabel: profile.fingerLabel,
      focusKeys: profile.focusKeys,
    },
    missCounts,
  );

  return {
    kind,
    title: def.title,
    reason: profile.reason,
    zone: profile.zone,
    fingerLabel: profile.fingerLabel,
    focusKeys: profile.focusKeys,
    weakKey,
    lockFinger:
      kind === "oneFinger" ? (profile.finger ?? weakestTypingFinger(missCounts)) : undefined,
    eyesUp: kind === "eyesUp" ? true : undefined,
  };
}

export function focusSpeedTarget(
  unlockedLevel: number,
  track: Track,
  recentWpm: number[],
  tier = 1,
): number {
  const level = getLevel(Math.min(unlockedLevel, 12));
  const campaign = track === "retrain" ? level.wpmRetrain : level.wpmLearn;
  const personal =
    recentWpm.length > 0
      ? recentWpm.reduce((a, b) => a + b, 0) / recentWpm.length
      : campaign * 0.75;
  const base = Math.max(Math.round(campaign * 0.55), Math.round(Math.min(campaign, personal * 0.9)));
  return base + (tier - 1) * 3;
}

export function countFocusMisses(
  keyEvents: { key: string; hit: boolean }[],
  plan: FocusPlan,
): number {
  const focus = new Set(plan.focusKeys);
  let n = 0;
  for (const ev of keyEvents) {
    if (!ev.hit && focus.has(ev.key)) n += 1;
  }
  return n;
}

export function focusRoundPassed(
  completed: boolean,
  _accuracy: number,
  wpm: number,
  _track: Track,
  keyEvents: { key: string; hit: boolean }[],
  plan: FocusPlan,
  phase: FocusPhase,
  targetWpm: number,
): boolean {
  if (!completed) return false;
  const focusMisses = countFocusMisses(keyEvents, plan);
  if (focusMisses > 0) return false;
  if (phase === "accuracy") return true;
  return wpm >= targetWpm;
}

export function focusFailureHint(
  completed: boolean,
  wpm: number,
  keyEvents: { key: string; hit: boolean }[],
  plan: FocusPlan,
  phase: FocusPhase,
  targetWpm: number,
): string {
  if (!completed) return "Finish the prompt before moving on.";
  const focusMisses = countFocusMisses(keyEvents, plan);
  if (focusMisses > 0) {
    return `Zero misses on your ${plan.fingerLabel} zone — you had ${focusMisses}.`;
  }
  if (phase === "speed" && wpm < targetWpm) {
    return `Need ${targetWpm} WPM on this zone — you hit ${wpm}.`;
  }
  return "";
}

export function focusCoachGoal(run: FocusRunState): string {
  if (run.phase === "accuracy") {
    return `Zero misses on ${run.plan.fingerLabel} zone`;
  }
  return `${run.targetWpm} WPM · zero focus misses`;
}

function rehabFinger(finger: FingerId): FingerId {
  return finger === "LT" || finger === "RT" ? "LI" : finger;
}

/** Word length and hand-alternation ramp with phase and speed tier. */
export function focusPromptComplexity(phase: FocusPhase, speedTier: number): FocusWordComplexity {
  if (phase === "accuracy") {
    return { minWordSyllables: 1, maxWordSyllables: 2, preferAlternating: false };
  }
  const tier = Math.max(1, speedTier);
  return {
    minWordSyllables: 2,
    maxWordSyllables: Math.min(2 + tier, 5),
    preferAlternating: tier >= 2,
  };
}

export function buildFocusPrompt(
  plan: FocusPlan,
  phase: FocusPhase,
  keys: string,
  missCounts: Record<string, number>,
  stats?: KeyStatMap,
  speedTier = 1,
  accuracyLength = ACCURACY_LENGTH,
): string {
  const length = phase === "accuracy" ? accuracyLength : SPEED_LENGTH;
  const finger = rehabFinger(plan.lockFinger ?? weakestTypingFinger(missCounts));
  const boost = plan.weakKey ?? primaryFocusKey(plan, missCounts);
  const complexity = focusPromptComplexity(phase, speedTier);
  const fingerKeys = keysForFinger(finger).filter((k) => /[a-z;,\.']/.test(k));

  switch (plan.kind) {
    case "oneFinger":
      return generateFocusFingerWords(
        keys,
        fingerKeys.length > 0 ? fingerKeys : ["f", "g", "r", "t"],
        length,
        complexity,
        stats,
        boost,
      );
    case "homeReturn":
      return generateFocusReachWords(keys, length, complexity, stats, boost);
    case "alternatingHands":
      return generateFocusAlternatingWords(keys, length, complexity, stats, boost);
    default:
      return generateFocusFingerWords(
        keys,
        fingerKeys.length > 0 ? fingerKeys : ["f", "g", "r", "t"],
        length,
        complexity,
        stats,
        boost,
      );
  }
}

export function focusRoundTitle(run: FocusRunState): string {
  const phase = run.phase === "accuracy" ? "Accuracy" : "Speed";
  const zone =
    run.plan.zone === "finger" || run.plan.zone === "slowKey"
      ? run.plan.fingerLabel
      : run.plan.title;
  if (run.phase === "speed") {
    const tier = run.speedTier > 1 ? ` · tier ${run.speedTier}` : "";
    return `Focus · ${phase} · ${zone} · ${run.targetWpm} WPM${tier}`;
  }
  return `Focus · ${phase} · ${zone}`;
}

export function focusHubPreview(
  missCounts: Record<string, number>,
  keyStats: KeyStatMap,
  keys: string,
): string {
  const profile = analyzeWeakness(missCounts, keyStats, keys);
  return profile.fingerLabel;
}
