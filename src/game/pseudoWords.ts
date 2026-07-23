import { fingerForKey } from "./fingers";
import {
  allowedChars,
  assembleUnits,
  charsetValid,
  pickWeighted,
  scoreTextWeakness,
  trimToLength,
  weakestKey,
} from "./keyBias";
import type { KeyStatMap } from "../lib/storage";

const VOWELS = "aeiou";

function syllablePool(keys: string): string[] {
  const pool = allowedChars(keys).filter((c) => c !== " ");
  const vowels = pool.filter((c) => VOWELS.includes(c));
  const consonants = pool.filter((c) => !VOWELS.includes(c));
  const out = new Set<string>();
  for (const c of consonants) {
    for (const v of vowels) {
      out.add(c + v);
      for (const c2 of consonants) {
        out.add(c + v + c2);
      }
    }
  }
  for (const v of vowels) out.add(v);
  return [...out].filter((s) => charsetValid(s, keys) && s.length >= 1);
}

function buildPseudoWord(
  keys: string,
  stats: KeyStatMap | undefined,
  syllableCount: number,
  preferAlternating: boolean,
): string {
  const syllables = syllablePool(keys);
  if (syllables.length === 0) return keys.replace(/ /g, "").slice(0, 4) || "as";
  const focus = weakestKey(allowedChars(keys).filter((c) => c !== " "), stats);
  let word = "";
  let prevHand: "left" | "right" | "thumb" | null = null;
  for (let i = 0; i < syllableCount; i++) {
    let options = syllables;
    if (preferAlternating && prevHand && prevHand !== "thumb") {
      const alt = syllables.filter((s) => {
        const hand = fingerForKey(s[0]).hand;
        return hand !== prevHand && hand !== "thumb";
      });
      if (alt.length > 0) options = alt;
    }
    const syllable = pickWeighted(options, stats, focus);
    word += syllable;
    prevHand = fingerForKey(syllable[syllable.length - 1]).hand;
  }
  return charsetValid(word, keys) ? word : syllables[0];
}

function pseudoWordUnits(
  keys: string,
  stats: KeyStatMap | undefined,
  preferAlternating: boolean,
  count: number,
): string[] {
  const units: string[] = [];
  for (let i = 0; i < count; i++) {
    const syllableCount = 2 + Math.floor(Math.random() * 3);
    units.push(buildPseudoWord(keys, stats, syllableCount, preferAlternating));
  }
  return units;
}

export function generatePseudoPrompt(
  keys: string,
  targetLength: number,
  stats?: KeyStatMap,
  preferAlternating = false,
): string {
  const candidates = pseudoWordUnits(keys, stats, preferAlternating, 24);
  if (!stats) return assembleUnits(candidates, targetLength, " ", keys);

  const focus = weakestKey(allowedChars(keys).filter((c) => c !== " "), stats);
  const weighted = candidates.flatMap((word) =>
    focus && word.includes(focus) ? [word, word] : [word],
  );
  weighted.sort((a, b) => scoreTextWeakness(b, stats) - scoreTextWeakness(a, stats));
  return assembleUnits(weighted, targetLength, " ", keys);
}

export function generateOneFingerGroups(
  fingerKeys: string[],
  targetLength: number,
  stats?: KeyStatMap,
): string {
  const pool = fingerKeys.filter((k) => /[a-z;,\.']/.test(k));
  if (pool.length === 0) return "fff fff rrr";
  const key = pickWeighted(pool, stats);
  const units: string[] = [];
  while (units.join(" ").length < targetLength) {
    units.push(key.repeat(3));
  }
  return trimToLength(units.join(" "), targetLength);
}
