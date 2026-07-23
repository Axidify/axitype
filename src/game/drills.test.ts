import { describe, expect, it } from "vitest";
import {
  buildDrillPrompt,
  countReachMisses,
  countSameHandMissPairs,
  suggestDrill,
  weakestFinger,
  weakestTypingFinger,
} from "./drills";
import { generateOneFingerDrill } from "./prompts";

describe("suggestDrill", () => {
  it("detects same-hand miss pairs", () => {
    const events = [
      { key: "a", hit: false },
      { key: "s", hit: false },
      { key: "d", hit: true },
    ];
    expect(countSameHandMissPairs(events)).toBe(1);
  });

  it("counts reach misses", () => {
    expect(countReachMisses({ a: 1, r: 3, f: 1 })).toBe(3);
  });

  it("suggests alternating hands for same-hand patterns", () => {
    const events = [
      { key: "a", hit: false },
      { key: "s", hit: false },
      { key: "d", hit: false },
      { key: "f", hit: false },
    ];
    const missCounts = { a: 1, s: 1, d: 1, f: 1 };
    const suggestion = suggestDrill(missCounts, events, 7);
    expect(suggestion?.kind).toBe("alternatingHands");
  });

  it("suggests home return for reach-heavy misses", () => {
    const events = [{ key: "r", hit: false }];
    const missCounts = { r: 2, t: 2, e: 1 };
    const suggestion = suggestDrill(missCounts, events, 5);
    expect(suggestion?.kind).toBe("homeReturn");
  });

  it("returns null when there are no misses", () => {
    expect(suggestDrill({}, [], 12)).toBeNull();
  });
});

describe("thumb exclusion", () => {
  it("weakestFinger can include thumb for space misses", () => {
    expect(weakestFinger({ " ": 10, f: 1 })).toBe("RT");
  });

  it("weakestTypingFinger ignores thumb / space", () => {
    expect(weakestTypingFinger({ " ": 10, f: 3, s: 1 })).toBe("LI");
  });

  it("oneFinger drill never locks thumb", () => {
    const built = buildDrillPrompt("oneFinger", "asdfjkl; ", { " ": 20 });
    expect(built.lockFinger).not.toBe("RT");
    expect(built.lockFinger).not.toBe("LT");
    expect(built.lockFinger).toBe("LI");
    expect(/[a-z]/.test(built.prompt)).toBe(true);
  });

  it("generateOneFingerDrill remaps thumb to letter keys", () => {
    const text = generateOneFingerDrill("RT", 24);
    expect(text.length).toBeGreaterThan(0);
    expect([...text].some((c) => c !== " ")).toBe(true);
    for (const ch of text) {
      if (ch === " ") continue;
      expect(/[a-z;,\.']/.test(ch)).toBe(true);
    }
  });
});
