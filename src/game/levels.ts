export type Track = "learn" | "retrain";

export type DrillKind =
  | "homeReturn"
  | "oneFinger"
  | "alternatingHands"
  | "weakFinger"
  | "eyesUp";

export interface LevelDef {
  id: number;
  title: string;
  keys: string;
  length: number;
  wpmLearn: number;
  wpmRetrain: number;
  timedSeconds?: number;
  eyesUp?: boolean;
  /** Drill unlocked after clearing this level (stage gate). */
  unlockDrill?: DrillKind;
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: "Home anchors",
    keys: "asl;",
    length: 40,
    wpmLearn: 12,
    wpmRetrain: 10,
  },
  {
    id: 2,
    title: "Left home lane",
    keys: "asdf",
    length: 50,
    wpmLearn: 14,
    wpmRetrain: 12,
  },
  {
    id: 3,
    title: "Right home lane",
    keys: "jkl;",
    length: 50,
    wpmLearn: 14,
    wpmRetrain: 12,
  },
  {
    id: 4,
    title: "Both hands + space",
    keys: "asdfjkl; ",
    length: 60,
    wpmLearn: 16,
    wpmRetrain: 14,
    unlockDrill: "homeReturn",
  },
  {
    id: 5,
    title: "Middle reaches",
    keys: "asdfjkl;ei ",
    length: 70,
    wpmLearn: 18,
    wpmRetrain: 15,
    unlockDrill: "oneFinger",
  },
  {
    id: 6,
    title: "Top row opens",
    keys: "asdfjkl;qwertyuiop ",
    length: 80,
    wpmLearn: 20,
    wpmRetrain: 16,
  },
  {
    id: 7,
    title: "Top row locked in",
    keys: "asdfjkl;qwertyuiop ",
    length: 100,
    wpmLearn: 22,
    wpmRetrain: 18,
    unlockDrill: "alternatingHands",
  },
  {
    id: 8,
    title: "Bottom row opens",
    keys: "asdfjkl;zxcv ",
    length: 90,
    wpmLearn: 20,
    wpmRetrain: 16,
  },
  {
    id: 9,
    title: "Full reach mix",
    keys: "asdfjkl;qwertyuiopzxcvbnm ",
    length: 110,
    wpmLearn: 24,
    wpmRetrain: 18,
    unlockDrill: "weakFinger",
  },
  {
    id: 10,
    title: "Full letters",
    keys: "abcdefghijklmnopqrstuvwxyz ",
    length: 130,
    wpmLearn: 28,
    wpmRetrain: 22,
  },
  {
    id: 11,
    title: "Light punctuation",
    keys: "abcdefghijklmnopqrstuvwxyz .,'",
    length: 140,
    wpmLearn: 30,
    wpmRetrain: 24,
  },
  {
    id: 12,
    title: "Eyes Up sprint",
    keys: "abcdefghijklmnopqrstuvwxyz ",
    length: 160,
    wpmLearn: 35,
    wpmRetrain: 26,
    timedSeconds: 90,
    eyesUp: true,
    unlockDrill: "eyesUp",
  },
];

export function getLevel(id: number): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

export function accuracyGate(track: Track): number {
  return track === "retrain" ? 96 : 94;
}

export function wpmTarget(level: LevelDef, track: Track): number {
  return track === "retrain" ? level.wpmRetrain : level.wpmLearn;
}
