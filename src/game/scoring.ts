import type { Track } from "./levels";
import { accuracyGate, type LevelDef, wpmTarget } from "./levels";

export function calcWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return Math.round((correctChars / 5) / minutes);
}

/**
 * Grade accuracy against the prompt: start at 100%, each miss permanently
 * costs 1 / promptLength. Correct keys never raise accuracy again.
 */
export function calcAccuracy(incorrect: number, promptLength: number): number {
  if (promptLength <= 0) return 100;
  const remaining = Math.max(0, promptLength - incorrect);
  return Math.round((remaining / promptLength) * 1000) / 10;
}

export function scoreForCorrect(combo: number): number {
  const mult = Math.min(8, Math.max(1, combo));
  return 10 * mult;
}

export function nextCombo(current: number, correct: boolean, comboPaused: boolean): number {
  if (!correct) return 1;
  if (comboPaused) return current;
  return Math.min(8, current + 1);
}

export function calcStars(
  completed: boolean,
  accuracy: number,
  wpm: number,
  level: LevelDef,
  track: Track,
  peeked = false,
): 0 | 1 | 2 | 3 {
  if (!completed) return 0;
  let stars: 0 | 1 | 2 | 3 = 1;
  if (accuracy >= accuracyGate(track)) stars = 2;
  if (stars === 2 && wpm >= wpmTarget(level, track) && !peeked) stars = 3;
  else if (stars === 2 && wpm >= wpmTarget(level, track) && peeked) stars = 2;
  return stars;
}
