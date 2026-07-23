export const MISS_TIPS = [
  "Same key → same finger",
  "Don’t peek — trust the F and J bumps",
  "Index for T/Y, not middle",
  "Thumbs only for space",
  "Return to home between reaches",
  "Slow is smooth — smooth becomes fast",
];

export function tipForMiss(missIndex: number): string {
  return MISS_TIPS[missIndex % MISS_TIPS.length];
}

/** Pace gate: last N attempts accuracy below threshold. */
export function shouldPaceGate(
  recent: boolean[],
  windowSize = 20,
  threshold = 0.9,
): boolean {
  if (recent.length < 8) return false;
  const slice = recent.slice(-windowSize);
  const correct = slice.filter(Boolean).length;
  return correct / slice.length < threshold;
}

export function paceGateCleared(correctStreak: number, need = 10): boolean {
  return correctStreak >= need;
}

export function showHandDiagram(
  track: "learn" | "retrain",
  levelId: number,
  formCoachOn: boolean,
): boolean {
  if (!formCoachOn) return false;
  if (track === "retrain") return true;
  return levelId <= 3;
}

export function showHomeCheck(
  track: "learn" | "retrain",
  levelId: number,
  skipHomeAfter5: boolean,
): boolean {
  if (track === "retrain") return true;
  if (levelId <= 5) return true;
  return !skipHomeAfter5;
}
