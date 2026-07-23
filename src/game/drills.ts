import type { FingerId } from "./fingers";
import { fingerForKey } from "./fingers";
import type { DrillKind } from "./levels";
import {
  generateAlternatingPrompt,
  generateHomeReturnPrompt,
  generateOneFingerPrompt,
  generatePrompt,
} from "./prompts";
import type { KeyStatMap } from "../lib/storage";

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

export function weakestFinger(missCounts: Record<string, number>): FingerId {
  const scores: Partial<Record<FingerId, number>> = {};
  for (const [key, n] of Object.entries(missCounts)) {
    const id = fingerForKey(key).id;
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

export function buildDrillPrompt(
  kind: DrillKind,
  keys: string,
  missCounts: Record<string, number>,
  stats?: KeyStatMap,
): { prompt: string; lockFinger?: FingerId; eyesUp?: boolean } {
  switch (kind) {
    case "oneFinger": {
      const finger = weakestFinger(missCounts);
      return { prompt: generateOneFingerPrompt(finger, 48), lockFinger: finger };
    }
    case "homeReturn":
      return { prompt: generateHomeReturnPrompt(keys, 56) };
    case "alternatingHands":
      return { prompt: generateAlternatingPrompt(keys, 64) };
    case "weakFinger": {
      const finger = weakestFinger(missCounts);
      return {
        prompt: generateOneFingerPrompt(finger, 52),
        lockFinger: finger,
      };
    }
    case "eyesUp":
      return {
        prompt: generatePrompt({ keys, length: 80, stats, preferAlternating: true }),
        eyesUp: true,
      };
    default:
      return { prompt: generatePrompt({ keys, length: 50, stats }) };
  }
}

export function getDrill(kind: DrillKind): DrillDef {
  return DRILLS.find((d) => d.kind === kind) ?? DRILLS[0];
}
