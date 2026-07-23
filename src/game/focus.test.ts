import { describe, expect, it } from "vitest";
import {
  analyzeWeakness,
  buildFocusPlan,
  buildFocusPrompt,
  countFocusMisses,
  focusFailureHint,
  focusPromptComplexity,
  focusRoundPassed,
  focusSpeedTarget,
  isFocusUnlocked,
} from "./focus";

describe("focus mode", () => {
  it("unlocks at mission 3", () => {
    expect(isFocusUnlocked(2, false)).toBe(false);
    expect(isFocusUnlocked(3, false)).toBe(true);
    expect(isFocusUnlocked(1, true)).toBe(true);
  });

  it("identifies finger weakness from miss data", () => {
    const profile = analyzeWeakness({ f: 5, j: 3 }, {}, "asdfjkl;qwerty ");
    expect(profile.zone).toBe("finger");
    expect(profile.finger).toBe("LI");
    expect(profile.focusKeys).toContain("f");
  });

  it("identifies reach weakness from miss data", () => {
    const profile = analyzeWeakness({ r: 3, t: 2, n: 3, m: 2 }, {}, "asdfjkl;qwerty ");
    expect(profile.zone).toBe("reach");
    expect(profile.focusKeys).toContain("r");
  });

  it("identifies slow keys from key stats", () => {
    const profile = analyzeWeakness(
      {},
      { j: { hits: 40, misses: 0, meanLatencyMs: 520 } },
      "asdfjkl;",
    );
    expect(profile.zone).toBe("slowKey");
    expect(profile.finger).toBe("RI");
  });

  it("passes accuracy phase with zero focus-zone misses", () => {
    const plan = buildFocusPlan({ f: 3 }, {}, "asdfjkl;");
    const events = [
      { key: "f", hit: true },
      { key: "a", hit: false },
    ];
    expect(focusRoundPassed(true, 97, 10, "learn", events, plan, "accuracy", 20)).toBe(true);
    expect(
      focusRoundPassed(true, 100, 10, "learn", [{ key: "f", hit: false }], plan, "accuracy", 20),
    ).toBe(false);
  });

  it("requires wpm target in the speed phase", () => {
    const plan = buildFocusPlan({ f: 3 }, {}, "asdfjkl;");
    const clean = [{ key: "f", hit: true }];
    expect(focusRoundPassed(true, 96, 25, "retrain", clean, plan, "speed", 20)).toBe(true);
    expect(focusRoundPassed(true, 96, 12, "retrain", clean, plan, "speed", 20)).toBe(false);
  });

  it("counts focus-zone misses only", () => {
    const plan = buildFocusPlan({ f: 3 }, {}, "asdfjkl;");
    const events = [
      { key: "f", hit: false },
      { key: "j", hit: false },
      { key: "a", hit: false },
    ];
    expect(countFocusMisses(events, plan)).toBe(1);
  });

  it("explains focus failures", () => {
    const plan = buildFocusPlan({ f: 3 }, {}, "asdfjkl;");
    expect(
      focusFailureHint(false, 0, [], plan, "accuracy", 20),
    ).toContain("Finish");
    expect(
      focusFailureHint(true, 10, [{ key: "f", hit: false }], plan, "accuracy", 20),
    ).toContain("Zero misses");
  });

  it("raises speed target per tier", () => {
    expect(focusSpeedTarget(6, "learn", [18, 20, 22], 2)).toBeGreaterThan(
      focusSpeedTarget(6, "learn", [18, 20, 22], 1),
    );
  });

  it("ramps word complexity in the speed phase", () => {
    const accuracy = focusPromptComplexity("accuracy", 1);
    const speed = focusPromptComplexity("speed", 3);
    expect(speed.maxWordSyllables).toBeGreaterThan(accuracy.maxWordSyllables);
    expect(speed.preferAlternating).toBe(true);
  });

  it("builds syllable-shaped focus prompts", () => {
    const plan = buildFocusPlan({ f: 3 }, {}, "asdfjkl;qwerty ");
    const prompt = buildFocusPrompt(plan, "accuracy", "asdfjkl;qwerty ", { f: 3 });
    expect(prompt).not.toMatch(/\b([a-z;])\1\1\b/);
    expect(prompt.split(/\s+/).some((word) => word.length >= 3)).toBe(true);
  });
});
