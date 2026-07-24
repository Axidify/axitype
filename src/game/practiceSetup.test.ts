import { describe, expect, it } from "vitest";
import { defaultProgress } from "../lib/storage";
import {
  buildPracticeSession,
  DEFAULT_PRACTICE_CONFIG,
  hasLetterMisses,
  keysForPracticeFocus,
  practiceMissCounts,
  practiceTitle,
  weakFingerPracticeTarget,
} from "./practiceSetup";

describe("practiceSetup", () => {
  const unlocked = "asdfjkl;qwertyuiopzxcvbnm ";

  it("filters home row keys", () => {
    const { keys } = keysForPracticeFocus(unlocked, "homeRow", {});
    expect(keys).not.toContain("q");
    expect(keys).toContain("a");
    expect(keys).toContain(";");
  });

  it("builds timed practice title", () => {
    expect(
      practiceTitle({ ...DEFAULT_PRACTICE_CONFIG, duration: "sprint120", focus: "topRow" }),
    ).toBe("Practice · 2 min · Top row");
  });

  it("builds one-finger prompt with lock finger", () => {
    const result = buildPracticeSession(
      { duration: "short", focus: "finger", finger: "LI" },
      unlocked,
      defaultProgress().keyStats,
      {},
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.lockFinger).toBe("LI");
    expect(result.result.prompt.length).toBeGreaterThan(10);
  });

  it("rejects focus with too few keys", () => {
    const result = buildPracticeSession(
      { duration: "short", focus: "topRow" },
      "asdf",
      undefined,
      {},
    );
    expect(result.ok).toBe(false);
  });

  it("weak focus narrows to weakest finger zone", () => {
    const { keys } = keysForPracticeFocus(unlocked, "weak", { q: 1, w: 5, e: 2 });
    expect(keys).toContain("w");
    expect(keys).toContain("s");
    expect(keys).not.toContain("a");
  });

  it("weak focus falls back to all unlocked when zone has too few keys", () => {
    const { keys } = keysForPracticeFocus("asdf", "weak", { q: 10 });
    expect(keys).toBe("asdf");
  });

  it("weak focus does not lock finger", () => {
    const result = buildPracticeSession(
      { duration: "short", focus: "weak" },
      unlocked,
      defaultProgress().keyStats,
      { q: 1, w: 8 },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.lockFinger).toBeUndefined();
  });

  describe("hasLetterMisses", () => {
    it("ignores space-only misses", () => {
      expect(hasLetterMisses({ " ": 10 })).toBe(false);
    });

    it("detects letter misses", () => {
      expect(hasLetterMisses({ f: 2 })).toBe(true);
    });
  });

  describe("practiceMissCounts", () => {
    it("prefers recent12 when it has letter misses", () => {
      const progress = defaultProgress();
      progress.roundHistory = [
        {
          levelId: 1,
          track: "learn",
          wpm: 40,
          accuracy: 90,
          score: 100,
          stars: 1,
          missCounts: { f: 3 },
        },
      ];
      progress.missCounts = { a: 20 };
      expect(practiceMissCounts(progress)).toEqual({ f: 3 });
    });

    it("falls back to lifetime when recent window is empty", () => {
      const progress = defaultProgress();
      progress.missCounts = { s: 4 };
      expect(practiceMissCounts(progress)).toEqual({ s: 4 });
    });
  });

  describe("weakFingerPracticeTarget", () => {
    it("returns null on cold start", () => {
      expect(weakFingerPracticeTarget(unlocked, {})).toBeNull();
      expect(weakFingerPracticeTarget(unlocked, { " ": 5 })).toBeNull();
    });

    it("returns finger label and sample keys when misses exist", () => {
      const target = weakFingerPracticeTarget(unlocked, { q: 1, w: 6 });
      expect(target).not.toBeNull();
      expect(target?.label).toBeTruthy();
      expect(target?.sampleKeys.length).toBeGreaterThan(0);
    });
  });
});
