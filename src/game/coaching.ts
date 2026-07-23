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

export const PACE_GATE_WINDOW = 20;
export const PACE_GATE_MIN_SAMPLES = 8;
export const PACE_GATE_THRESHOLD = 0.9;
export const PACE_GATE_CLEAR_STREAK = 10;
export const PACE_GATE_SCORE = 5;

export const PACE_GATE_MESSAGE = "Slow down — reset to home";

/** Pace gate: last N attempts accuracy below threshold. */
export function shouldPaceGate(
  recent: boolean[],
  windowSize = PACE_GATE_WINDOW,
  threshold = PACE_GATE_THRESHOLD,
): boolean {
  if (recent.length < PACE_GATE_MIN_SAMPLES) return false;
  const slice = recent.slice(-windowSize);
  const correct = slice.filter(Boolean).length;
  return correct / slice.length < threshold;
}

export function paceGateCleared(
  correctStreak: number,
  need = PACE_GATE_CLEAR_STREAK,
): boolean {
  return correctStreak >= need;
}

export function recordAttempt(recent: boolean[], hit: boolean, windowSize = PACE_GATE_WINDOW): void {
  recent.push(hit);
  if (recent.length > windowSize) recent.shift();
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
