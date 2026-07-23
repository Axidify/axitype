import type { FingerId } from "./fingers";
import { FINGERS, fingerForKey, isHomeKey } from "./fingers";
import type { DrillKind } from "./levels";
import type { KeyStatMap } from "../lib/storage";
import {
  buildSessionPrompt,
  generateAlternatingDrill,
  generateHomeReturnDrill,
  generateOneFingerDrill,
} from "./prompts";

export interface DrillDef {
  kind: DrillKind;
  title: string;
  blurb: string;
  afterLevel: number;
}

export const DRILLS: DrillDef[] = [
  {
    kind: "homeReturn",
    title: "Home Return",
    blurb: "After every reach, return to that finger’s home key.",
    afterLevel: 4,
  },
  {
    kind: "oneFinger",
    title: "One Finger",
    blurb: "Only one finger’s keys — kill the two-finger habit.",
    afterLevel: 5,
  },
  {
    kind: "alternatingHands",
    title: "Alternating Hands",
    blurb: "Left ↔ right digraphs. Break same-hand pecking.",
    afterLevel: 7,
  },
  {
    kind: "weakFinger",
    title: "Weak Finger",
    blurb: "Rehab the finger zone with the most misses.",
    afterLevel: 9,
  },
  {
    kind: "eyesUp",
    title: "Eyes Up",
    blurb: "Keyboard hides. Trust bumps and the finger chip.",
    afterLevel: 12,
  },
];

export function weakestFinger(
  missCounts: Record<string, number>,
  opts?: { excludeThumbs?: boolean },
): FingerId {
  const scores: Partial<Record<FingerId, number>> = {};
  for (const [key, n] of Object.entries(missCounts)) {
    const id = fingerForKey(key).id;
    if (opts?.excludeThumbs && (id === "LT" || id === "RT")) continue;
    scores[id] = (scores[id] ?? 0) + n;
  }
  let best: FingerId = "LI";
  let max = -1;
  for (const [id, n] of Object.entries(scores) as [FingerId, number][]) {
    if (n > max) {
      max = n;
      best = id;
    }
  }
  return best;
}

/** One Finger / Weak Finger rehab — never thumb (space-only zone). */
export function weakestTypingFinger(missCounts: Record<string, number>): FingerId {
  return weakestFinger(missCounts, { excludeThumbs: true });
}

export function missCountsFromEvents(
  keyEvents: { key: string; hit: boolean }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ev of keyEvents) {
    if (ev.hit) continue;
    out[ev.key] = (out[ev.key] ?? 0) + 1;
  }
  return out;
}

export function topMissedKeys(
  missCounts: Record<string, number>,
  limit = 3,
): { key: string; count: number }[] {
  return Object.entries(missCounts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface DrillSuggestion {
  kind: DrillKind;
  afterLevel: number;
  title: string;
  reason: string;
}

export function countSameHandMissPairs(
  keyEvents: { key: string; hit: boolean }[],
): number {
  let pairs = 0;
  let prevMiss: string | null = null;
  for (const ev of keyEvents) {
    if (ev.hit) {
      prevMiss = null;
      continue;
    }
    if (prevMiss) {
      const h1 = fingerForKey(prevMiss).hand;
      const h2 = fingerForKey(ev.key).hand;
      if (h1 === h2 && h1 !== "thumb") pairs += 1;
    }
    prevMiss = ev.key;
  }
  return pairs;
}

export function countReachMisses(missCounts: Record<string, number>): number {
  let total = 0;
  for (const [key, n] of Object.entries(missCounts)) {
    if (!isHomeKey(key)) total += n;
  }
  return total;
}

function fingerMissShare(missCounts: Record<string, number>, finger: FingerId): number {
  const total = Object.values(missCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let fingerTotal = 0;
  for (const [key, n] of Object.entries(missCounts)) {
    if (fingerForKey(key).id === finger) fingerTotal += n;
  }
  return fingerTotal / total;
}

export function suggestDrill(
  missCounts: Record<string, number>,
  keyEvents: { key: string; hit: boolean }[],
  unlockedLevel: number,
  demoMode = false,
): DrillSuggestion | null {
  const totalMisses = Object.values(missCounts).reduce((a, b) => a + b, 0);
  if (totalMisses === 0) return null;

  const canUse = (afterLevel: number) => demoMode || unlockedLevel >= afterLevel;

  const sameHandPairs = countSameHandMissPairs(keyEvents);
  if (sameHandPairs >= 2 && canUse(7)) {
    const drill = getDrill("alternatingHands");
    return {
      kind: drill.kind,
      afterLevel: drill.afterLevel,
      title: drill.title,
      reason: "Back-to-back misses on the same hand — try alternating left ↔ right.",
    };
  }

  const reachMisses = countReachMisses(missCounts);
  if (reachMisses >= 3 && canUse(4)) {
    const drill = getDrill("homeReturn");
    return {
      kind: drill.kind,
      afterLevel: drill.afterLevel,
      title: drill.title,
      reason: "Most misses are on reach keys — practice returning to home after each stretch.",
    };
  }

  const weak = weakestTypingFinger(missCounts);
  if (fingerMissShare(missCounts, weak) >= 0.45 && canUse(5)) {
    const drill = getDrill("oneFinger");
    const sampleKey =
      Object.keys(missCounts).find((k) => fingerForKey(k).id === weak) ?? FINGERS[weak].home;
    return {
      kind: drill.kind,
      afterLevel: drill.afterLevel,
      title: drill.title,
      reason: `Misses cluster on ${fingerForKey(sampleKey).label.toLowerCase()} — isolate that finger.`,
    };
  }

  if (canUse(9)) {
    const drill = getDrill("weakFinger");
    return {
      kind: drill.kind,
      afterLevel: drill.afterLevel,
      title: drill.title,
      reason: "Rehab the finger zone with the most misses this run.",
    };
  }

  if (canUse(5)) {
    const drill = getDrill("oneFinger");
    return {
      kind: drill.kind,
      afterLevel: drill.afterLevel,
      title: drill.title,
      reason: "Slow down and let one finger own its keys.",
    };
  }

  if (canUse(4)) {
    const drill = getDrill("homeReturn");
    return {
      kind: drill.kind,
      afterLevel: drill.afterLevel,
      title: drill.title,
      reason: "Reach, then return to home before the next key.",
    };
  }

  return null;
}

const DRILL_LENGTH: Record<DrillKind, number> = {
  homeReturn: 56,
  oneFinger: 48,
  alternatingHands: 64,
  weakFinger: 52,
  eyesUp: 80,
};

export function buildDrillPrompt(
  kind: DrillKind,
  keys: string,
  missCounts: Record<string, number>,
  stats?: KeyStatMap,
): { prompt: string; lockFinger?: FingerId; eyesUp?: boolean } {
  const targetLength = DRILL_LENGTH[kind];
  switch (kind) {
    case "oneFinger": {
      const finger = weakestTypingFinger(missCounts);
      return {
        prompt: generateOneFingerDrill(finger, targetLength, stats),
        lockFinger: finger,
      };
    }
    case "homeReturn":
      return { prompt: generateHomeReturnDrill(keys, targetLength, stats) };
    case "alternatingHands":
      return { prompt: generateAlternatingDrill(keys, targetLength, stats) };
    case "weakFinger": {
      const finger = weakestTypingFinger(missCounts);
      return {
        prompt: generateOneFingerDrill(finger, targetLength, stats),
        lockFinger: finger,
      };
    }
    case "eyesUp":
      return {
        prompt: buildSessionPrompt({
          mode: "drill",
          drill: "eyesUp",
          keys,
          targetLength,
          stats,
          preferShort: true,
        }),
        eyesUp: true,
      };
    default:
      return {
        prompt: buildSessionPrompt({
          mode: "pseudo",
          keys,
          targetLength: 50,
          stats,
        }),
      };
  }
}

export function getDrill(kind: DrillKind): DrillDef {
  return DRILLS.find((d) => d.kind === kind) ?? DRILLS[0];
}
