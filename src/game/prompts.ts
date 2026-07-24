import type { DrillKind } from "./levels";
import { fingerForKey, keysForFinger, type FingerId } from "./fingers";
import type { KeyStatMap } from "../lib/storage";
import {
  allowedChars,
  pickWeighted,
  trimToLength,
} from "./keyBias";
import { generatePatternPrompt } from "./promptChunks";
import { generatePseudoPrompt, generateOneFingerGroups } from "./pseudoWords";
import { generateSentencePrompt } from "./sentences";

export { weakestKey } from "./keyBias";

export type PromptMode = "pattern" | "pseudo" | "sentence" | "drill";

export function promptModeForLevel(levelId: number): "pattern" | "pseudo" | "sentence" {
  if (levelId <= 4) return "pattern";
  if (levelId <= 9) return "pseudo";
  return "sentence";
}

export function promptModeForPractice(keys: string): "pseudo" | "sentence" {
  const letterCount = keys.replace(/\s/g, "").length;
  return letterCount >= 20 ? "sentence" : "pseudo";
}

export function buildSessionPrompt(opts: {
  mode: PromptMode;
  keys: string;
  targetLength: number;
  levelId?: number;
  drill?: DrillKind;
  stats?: KeyStatMap;
  lockFinger?: FingerId;
  preferAlternating?: boolean;
  preferShort?: boolean;
}): string {
  switch (opts.mode) {
    case "pattern":
      return generatePatternPrompt(opts.levelId ?? 1, opts.keys, opts.targetLength, opts.stats);
    case "pseudo":
      return generatePseudoPrompt(
        opts.keys,
        opts.targetLength,
        opts.stats,
        opts.preferAlternating,
      );
    case "sentence":
      return generateSentencePrompt(
        opts.keys,
        opts.targetLength,
        opts.stats,
        opts.preferShort,
      );
    case "drill":
      return buildDrillPromptText(opts);
    default:
      return generatePseudoPrompt(opts.keys, opts.targetLength, opts.stats);
  }
}

function buildDrillPromptText(opts: {
  drill?: DrillKind;
  keys: string;
  targetLength: number;
  stats?: KeyStatMap;
  lockFinger?: FingerId;
}): string {
  switch (opts.drill) {
    case "homeReturn":
      return generateHomeReturnDrill(opts.keys, opts.targetLength, opts.stats);
    case "oneFinger":
    case "weakFinger":
      return generateOneFingerDrill(opts.lockFinger ?? "LI", opts.targetLength, opts.stats);
    case "alternatingHands":
      return generateAlternatingDrill(opts.keys, opts.targetLength, opts.stats);
    case "eyesUp":
      return generateSentencePrompt(opts.keys, opts.targetLength, opts.stats, true);
    default:
      return generatePseudoPrompt(opts.keys, opts.targetLength, opts.stats);
  }
}

export function generateHomeReturnDrill(
  keys: string,
  targetLength: number,
  stats?: KeyStatMap,
  focusBoost?: string,
): string {
  const pool = allowedChars(keys);
  let offHome = pool.filter((c) => !"asdfjkl; ".includes(c) && c !== " ");
  if (offHome.length === 0) {
    offHome = pool.filter((c) => c !== " ");
  }
  const units: string[] = [];
  while (units.join("  ").length < targetLength) {
    const reach = pickWeighted(
      offHome,
      stats,
      focusBoost && offHome.includes(focusBoost) ? focusBoost : undefined,
    );
    const home = fingerForKey(reach).home;
    if (pool.includes(home)) {
      units.push(`${reach} ${home}`);
    } else {
      units.push(reach);
    }
  }
  return trimToLength(units.join("  "), targetLength);
}

export function generateAlternatingDrill(
  keys: string,
  targetLength: number,
  stats?: KeyStatMap,
  focusBoost?: string,
): string {
  const pool = allowedChars(keys).filter((c) => c !== " ");
  const leftKeys = pool.filter((c) => fingerForKey(c).hand === "left");
  const rightKeys = pool.filter((c) => fingerForKey(c).hand === "right");
  if (leftKeys.length === 0 || rightKeys.length === 0) {
    return generatePseudoPrompt(keys, targetLength, stats, true);
  }
  const units: string[] = [];
  while (units.join(" ").length < targetLength) {
    const leftBoost =
      focusBoost && leftKeys.includes(focusBoost) ? focusBoost : undefined;
    const rightBoost =
      focusBoost && rightKeys.includes(focusBoost) ? focusBoost : undefined;
    units.push(
      pickWeighted(leftKeys, stats, leftBoost) + pickWeighted(rightKeys, stats, rightBoost),
    );
  }
  return trimToLength(units.join(" "), targetLength);
}

export function generateOneFingerDrill(
  finger: FingerId,
  targetLength: number,
  stats?: KeyStatMap,
  focusBoost?: string,
): string {
  // Thumb only owns space — not a useful one-finger rehab zone.
  const target: FingerId = finger === "LT" || finger === "RT" ? "LI" : finger;
  const keys = keysForFinger(target).filter((k) => /[a-z;,.']/.test(k));
  const pool = keys.length ? keys : ["f", "g", "r", "t"];
  const boost = focusBoost && pool.includes(focusBoost) ? focusBoost : undefined;
  return generateOneFingerGroups(pool, targetLength, stats, boost);
}

/** @deprecated Use buildSessionPrompt — kept for tests migrating off digraph output. */
export function generatePrompt(options: {
  keys: string;
  length: number;
  stats?: KeyStatMap;
  preferAlternating?: boolean;
}): string {
  const letterCount = options.keys.replace(/\s/g, "").length;
  const mode = letterCount >= 20 ? "sentence" : "pseudo";
  return buildSessionPrompt({
    mode,
    keys: options.keys,
    targetLength: options.length,
    stats: options.stats,
    preferAlternating: options.preferAlternating,
  });
}

export function generateOneFingerPrompt(finger: FingerId, length = 50): string {
  return generateOneFingerDrill(finger, length);
}

export function generateHomeReturnPrompt(keys: string, length = 60): string {
  return generateHomeReturnDrill(keys, length);
}

export function generateAlternatingPrompt(keys: string, length = 70): string {
  return generateAlternatingDrill(keys, length);
}
