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

export interface StarRequirement {
  stars: 1 | 2 | 3;
  label: string;
  met: boolean;
  detail?: string;
}

export interface StarBreakdown {
  stars: 0 | 1 | 2 | 3;
  requirements: StarRequirement[];
  /** Short hint for the next unlock / star the player missed. */
  nextHint: string | null;
}

export function explainStars(
  completed: boolean,
  accuracy: number,
  wpm: number,
  level: LevelDef,
  track: Track,
  peeked = false,
  timedOut = false,
): StarBreakdown {
  const gate = accuracyGate(track);
  const target = wpmTarget(level, track);
  const stars = calcStars(completed, accuracy, wpm, level, track, peeked);

  const requirements: StarRequirement[] = [
    {
      stars: 1,
      label: "Finish the full prompt",
      met: completed,
      detail: timedOut ? "Timed out before the end" : undefined,
    },
    {
      stars: 2,
      label: `Accuracy ≥ ${gate}%`,
      met: completed && accuracy >= gate,
      detail: completed ? `You had ${accuracy}%` : undefined,
    },
    {
      stars: 3,
      label: `WPM ≥ ${target} · no peek`,
      met: completed && accuracy >= gate && wpm >= target && !peeked,
      detail: peeked
        ? "Peek used — 3rd star gated"
        : completed && accuracy >= gate
          ? `You had ${wpm} WPM`
          : undefined,
    },
  ];

  let nextHint: string | null = null;
  if (timedOut) {
    nextHint = "Timed out — 0★. Finish before the clock hits zero to unlock.";
  } else if (!completed) {
    nextHint = "Finish the prompt to earn stars and unlock the next mission.";
  } else if (stars < 2) {
    nextHint = `Need ${gate}% accuracy to unlock the next mission — you had ${accuracy}%.`;
  } else if (stars === 2 && peeked) {
    nextHint = "Peek used — earn 3★ next time without peeking.";
  } else if (stars === 2 && wpm < target) {
    nextHint = `Need ${target} WPM for 3★ — you had ${wpm}.`;
  }

  return { stars, requirements, nextHint };
}
