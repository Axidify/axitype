import { fingerForKey, isHomeKey } from "./fingers";
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
  focusBoost?: string,
): string {
  const pool = fingerKeys.filter((k) => /[a-z;,.']/.test(k));
  if (pool.length === 0) return "fff fff rrr";
  const boost = focusBoost && pool.includes(focusBoost) ? focusBoost : undefined;
  const key = pickWeighted(pool, stats, boost);
  const units: string[] = [];
  while (units.join(" ").length < targetLength) {
    units.push(key.repeat(3));
  }
  return trimToLength(units.join(" "), targetLength);
}

export interface FocusWordComplexity {
  minWordSyllables: number;
  maxWordSyllables: number;
  preferAlternating: boolean;
}

/** Syllable-based words biased to a finger zone — builds real word-shape familiarity. */
export function generateFocusFingerWords(
  keys: string,
  fingerKeys: string[],
  targetLength: number,
  complexity: FocusWordComplexity,
  stats?: KeyStatMap,
  focusBoost?: string,
): string {
  const zonePool = fingerSyllablePool(keys, fingerKeys);
  const units = focusWordUnits(
    keys,
    zonePool,
    stats,
    focusBoost,
    complexity,
    Math.ceil(targetLength / 5),
  );
  return assembleFocusUnits(units, targetLength, stats, focusBoost);
}

/** Reach pseudo-word + home key pairs, with longer reach chunks as complexity rises. */
export function generateFocusReachWords(
  keys: string,
  targetLength: number,
  complexity: FocusWordComplexity,
  stats?: KeyStatMap,
  focusBoost?: string,
): string {
  const pool = allowedChars(keys);
  let offHome = pool.filter((c) => !isHomeKey(c) && c !== " ");
  if (offHome.length === 0) offHome = pool.filter((c) => c !== " ");
  const reachSyllables = syllablePool(keys).filter((s) =>
    [...s].some((ch) => offHome.includes(ch)),
  );
  const reachPool = reachSyllables.length > 0 ? reachSyllables : offHome;

  const units: string[] = [];
  while (units.join("  ").length < targetLength) {
    const syllableCount =
      complexity.minWordSyllables +
      Math.floor(Math.random() * (complexity.maxWordSyllables - complexity.minWordSyllables + 1));
    let reach = "";
    for (let i = 0; i < syllableCount; i++) {
      reach += pickWeighted(
        reachPool,
        stats,
        focusBoost && reachPool.some((s) => s.includes(focusBoost)) ? focusBoost : undefined,
      );
    }
    const home = fingerForKey(reach[0] ?? offHome[0]).home;
    if (pool.includes(home)) units.push(`${reach} ${home === " " ? " " : home}`);
    else units.push(reach);
  }
  return trimToLength(units.join("  "), targetLength);
}

/** Full-keyboard pseudo-words for alternating-hand rehab. */
export function generateFocusAlternatingWords(
  keys: string,
  targetLength: number,
  complexity: FocusWordComplexity,
  stats?: KeyStatMap,
  focusBoost?: string,
): string {
  const pool = syllablePool(keys);
  const units = focusWordUnits(keys, pool, stats, focusBoost, complexity, Math.ceil(targetLength / 5));
  return assembleFocusUnits(units, targetLength, stats, focusBoost);
}

function fingerSyllablePool(keys: string, fingerKeys: string[]): string[] {
  const all = syllablePool(keys);
  const zone = new Set(fingerKeys);
  const matched = all.filter((s) => [...s].some((ch) => zone.has(ch)));
  return matched.length > 0 ? matched : all;
}

function focusWordUnits(
  keys: string,
  syllables: string[],
  stats: KeyStatMap | undefined,
  focusBoost: string | undefined,
  complexity: FocusWordComplexity,
  count: number,
): string[] {
  const units: string[] = [];
  for (let i = 0; i < count; i++) {
    const syllableCount =
      complexity.minWordSyllables +
      Math.floor(Math.random() * (complexity.maxWordSyllables - complexity.minWordSyllables + 1));
    units.push(
      buildSyllableWord(
        keys,
        syllables,
        stats,
        syllableCount,
        focusBoost,
        complexity.preferAlternating,
      ),
    );
  }
  return units;
}

function buildSyllableWord(
  keys: string,
  syllables: string[],
  stats: KeyStatMap | undefined,
  syllableCount: number,
  focusBoost: string | undefined,
  preferAlternating: boolean,
): string {
  if (syllables.length === 0) return keys.replace(/ /g, "").slice(0, 4) || "as";
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
    const syllable = pickWeighted(
      options,
      stats,
      focusBoost && options.some((s) => s.includes(focusBoost)) ? focusBoost : undefined,
    );
    word += syllable;
    prevHand = fingerForKey(syllable[syllable.length - 1]).hand;
  }
  return charsetValid(word, keys) ? word : syllables[0];
}

function assembleFocusUnits(
  units: string[],
  targetLength: number,
  stats: KeyStatMap | undefined,
  focusBoost?: string,
): string {
  const weighted = units.flatMap((word) =>
    focusBoost && word.includes(focusBoost) ? [word, word, word] : [word],
  );
  if (stats) {
    weighted.sort((a, b) => scoreTextWeakness(b, stats) - scoreTextWeakness(a, stats));
  }
  return assembleUnits(weighted, targetLength, " ", undefined);
}
