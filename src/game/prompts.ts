import { fingerForKey, type FingerId, keysForFinger } from "./fingers";
import type { KeyStatMap } from "../lib/storage";

const DIGRAPHS: Record<string, string> = {
  a: "sdrfl ",
  s: "adefw ",
  d: "safec ",
  f: "dgart ",
  j: "hkunm ",
  k: "jli,o ",
  l: "k;o.p ",
  ";": "l[p/' ",
  e: "rdsiw ",
  i: "uojk8 ",
  r: "tfde4 ",
  t: "ryfg5 ",
  q: "wa ",
  w: "qeas ",
  y: "uhjt ",
  u: "yihj ",
  o: "iplk ",
  p: "o;[ ",
  z: "ax ",
  x: "zsc ",
  c: "xdv ",
  v: "cbf ",
  b: "vgn ",
  n: "bmhj ",
  m: "njik ",
  " ": "etaoins ",
  ".": "l ",
  ",": "k ",
  "'": "; ",
};

function weaknessWeight(key: string, stats: KeyStatMap | undefined): number {
  if (!stats?.[key]) return 1;
  const s = stats[key];
  const total = s.hits + s.misses;
  const missRate = total === 0 ? 0 : s.misses / total;
  const latencyPenalty = Math.min(2, (s.meanLatencyMs || 200) / 400);
  return 1 + missRate * 4 + latencyPenalty;
}

function pickWeighted(chars: string[], stats?: KeyStatMap, focusBoost?: string): string {
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

function allowedChars(keys: string): string[] {
  return [...new Set(keys.split(""))];
}

function nextFromDigraph(prev: string, pool: string[], stats?: KeyStatMap, focus?: string): string {
  const candidates = (DIGRAPHS[prev.toLowerCase()] ?? "")
    .split("")
    .filter((c) => pool.includes(c));
  const options = candidates.length > 0 ? candidates : pool;
  return pickWeighted(options, stats, focus);
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

export function generatePrompt(options: {
  keys: string;
  length: number;
  stats?: KeyStatMap;
  preferAlternating?: boolean;
}): string {
  const pool = allowedChars(options.keys);
  if (pool.length === 0) return "asdf";
  const focus = weakestKey(pool, options.stats);
  let out = "";
  let prev = pickWeighted(pool.filter((c) => c !== " "), options.stats, focus);

  for (let i = 0; i < options.length; i++) {
    let next: string;
    if (options.preferAlternating && i > 0) {
      const prevHand = fingerForKey(prev).hand;
      const alt = pool.filter((c) => {
        const h = fingerForKey(c).hand;
        return h !== prevHand && h !== "thumb";
      });
      next =
        alt.length > 0
          ? pickWeighted(alt, options.stats, focus)
          : nextFromDigraph(prev, pool, options.stats, focus);
    } else {
      next = nextFromDigraph(prev, pool, options.stats, focus);
    }
    // Avoid huge runs of spaces
    if (next === " " && (prev === " " || i === 0)) {
      next = pickWeighted(
        pool.filter((c) => c !== " "),
        options.stats,
        focus,
      );
    }
    out += next;
    prev = next;
  }
  return out.trimEnd() || pool[0].repeat(Math.min(8, options.length));
}

export function generateOneFingerPrompt(finger: FingerId, length = 50): string {
  const keys = keysForFinger(finger).filter((k) => /[a-z;,\.\' ]/.test(k));
  const pool = keys.length ? keys : ["a"];
  return generatePrompt({ keys: pool.join(""), length, preferAlternating: false });
}

export function generateHomeReturnPrompt(keys: string, length = 60): string {
  const pool = allowedChars(keys);
  const offHome = pool.filter((c) => !"asdfjkl; ".includes(c));
  if (offHome.length === 0) {
    return generatePrompt({ keys, length });
  }
  let out = "";
  while (out.length < length) {
    const reach = pickWeighted(offHome);
    const home = fingerForKey(reach).home;
    out += reach + (pool.includes(home) ? home : " ");
  }
  return out.slice(0, length);
}

export function generateAlternatingPrompt(keys: string, length = 70): string {
  return generatePrompt({ keys, length, preferAlternating: true });
}
