export type FingerId =
  | "LP"
  | "LR"
  | "LM"
  | "LI"
  | "LT"
  | "RT"
  | "RI"
  | "RM"
  | "RR"
  | "RP";

export type Hand = "left" | "right" | "thumb";

export interface FingerInfo {
  id: FingerId;
  label: string;
  home: string;
  hand: Hand;
  cssVar: string;
}

export const FINGERS: Record<FingerId, FingerInfo> = {
  LP: { id: "LP", label: "Left pinky", home: "a", hand: "left", cssVar: "--finger-lp" },
  LR: { id: "LR", label: "Left ring", home: "s", hand: "left", cssVar: "--finger-lr" },
  LM: { id: "LM", label: "Left middle", home: "d", hand: "left", cssVar: "--finger-lm" },
  LI: { id: "LI", label: "Left index", home: "f", hand: "left", cssVar: "--finger-li" },
  LT: { id: "LT", label: "Left thumb", home: " ", hand: "thumb", cssVar: "--finger-thumb" },
  RT: { id: "RT", label: "Right thumb", home: " ", hand: "thumb", cssVar: "--finger-thumb" },
  RI: { id: "RI", label: "Right index", home: "j", hand: "right", cssVar: "--finger-ri" },
  RM: { id: "RM", label: "Right middle", home: "k", hand: "right", cssVar: "--finger-rm" },
  RR: { id: "RR", label: "Right ring", home: "l", hand: "right", cssVar: "--finger-rr" },
  RP: { id: "RP", label: "Right pinky", home: ";", hand: "right", cssVar: "--finger-rp" },
};

const KEY_TO_FINGER: Record<string, FingerId> = {
  "`": "LP",
  "1": "LP",
  q: "LP",
  a: "LP",
  z: "LP",
  "2": "LR",
  w: "LR",
  s: "LR",
  x: "LR",
  "3": "LM",
  e: "LM",
  d: "LM",
  c: "LM",
  "4": "LI",
  "5": "LI",
  r: "LI",
  t: "LI",
  f: "LI",
  g: "LI",
  v: "LI",
  b: "LI",
  " ": "RT",
  "6": "RI",
  "7": "RI",
  y: "RI",
  u: "RI",
  h: "RI",
  j: "RI",
  n: "RI",
  m: "RI",
  "8": "RM",
  i: "RM",
  k: "RM",
  ",": "RM",
  "9": "RR",
  o: "RR",
  l: "RR",
  ".": "RR",
  "0": "RP",
  "-": "RP",
  "=": "RP",
  p: "RP",
  "[": "RP",
  "]": "RP",
  "\\": "RP",
  ";": "RP",
  "'": "RP",
  "/": "RP",
};

export function fingerForKey(char: string): FingerInfo {
  const lower = char.toLowerCase();
  const id = KEY_TO_FINGER[lower] ?? KEY_TO_FINGER[char] ?? "RI";
  return FINGERS[id];
}

export function keysForFinger(finger: FingerId): string[] {
  return Object.entries(KEY_TO_FINGER)
    .filter(([, id]) => id === finger)
    .map(([key]) => key);
}

export function isHomeKey(char: string): boolean {
  return "asdfjkl; ".includes(char.toLowerCase()) || char === ";";
}

export function reachCue(char: string): string {
  const finger = fingerForKey(char);
  const target = char === " " ? "space" : char;
  if (finger.home === char.toLowerCase() || (char === " " && finger.hand === "thumb")) {
    return `Home · ${finger.label}`;
  }
  const homeLabel = finger.home === " " ? "space" : finger.home.toUpperCase();
  return `Reach from ${homeLabel} · ${finger.label} → ${target === "space" ? "Space" : target}`;
}

export const HOME_ROW = ["a", "s", "d", "f", "j", "k", "l", ";"] as const;
