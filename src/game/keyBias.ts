import type { KeyStatMap } from "../lib/storage";

export function allowedChars(keys: string): string[] {
  return [...new Set(keys.split(""))];
}

export function charsetValid(text: string, keys: string): boolean {
  const allowed = new Set(keys.split(""));
  for (const ch of text) {
    if (!allowed.has(ch)) return false;
  }
  return true;
}

export function weaknessWeight(key: string, stats: KeyStatMap | undefined): number {
  if (!stats?.[key]) return 1;
  const s = stats[key];
  const total = s.hits + s.misses;
  const missRate = total === 0 ? 0 : s.misses / total;
  const latencyPenalty = Math.min(2, (s.meanLatencyMs || 200) / 400);
  return 1 + missRate * 4 + latencyPenalty;
}

export function pickWeighted(chars: string[], stats?: KeyStatMap, focusBoost?: string): string {
  if (chars.length === 0) return "";
  const weights = chars.map((c) => {
    let w = weaknessWeight(c, stats);
    if (focusBoost && c === focusBoost) w *= 3;
    return w;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < chars.length; i++) {
    r -= weights[i];
    if (r <= 0) return chars[i];
  }
  return chars[chars.length - 1];
}

export function weakestKey(pool: string[], stats?: KeyStatMap): string | undefined {
  if (!stats || pool.length === 0) return undefined;
  let worst: string | undefined;
  let score = -1;
  for (const k of pool) {
    const s = stats[k];
    if (!s) continue;
    const total = s.hits + s.misses;
    if (total < 3) continue;
    const w = weaknessWeight(k, stats);
    if (w > score) {
      score = w;
      worst = k;
    }
  }
  return worst;
}

export function scoreTextWeakness(text: string, stats?: KeyStatMap): number {
  if (!stats) return 1;
  let score = 0;
  for (const ch of text) {
    if (ch === " ") continue;
    score += weaknessWeight(ch, stats);
  }
  return score;
}

export function trimToLength(text: string, targetLength: number): string {
  if (text.length <= targetLength) return text.trimEnd();
  const trimmed = text.slice(0, targetLength);
  const lastSpace = trimmed.lastIndexOf(" ");
  return (lastSpace > targetLength * 0.55 ? trimmed.slice(0, lastSpace) : trimmed).trimEnd();
}

export function assembleUnits(
  units: string[],
  targetLength: number,
  separator = " ",
  keys?: string,
): string {
  if (units.length === 0) return "";
  const sep = keys && !keys.includes(" ") ? "" : separator;
  let out = "";
  let i = Math.floor(Math.random() * units.length);
  while (out.length < targetLength) {
    if (out.length > 0) out += sep;
    out += units[i % units.length];
    i += 1;
  }
  return trimToLength(out, targetLength);
}
