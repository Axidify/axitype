import { describe, expect, it } from "vitest";
import {
  bestLevelRows,
  formatTrendDelta,
  halfTrendDelta,
  mean,
  roundShortLabel,
} from "./statsSummary";

describe("statsSummary", () => {
  it("computes mean and half-trend delta", () => {
    expect(mean([])).toBeNull();
    expect(mean([10, 20, 30])).toBe(20);
    expect(halfTrendDelta([10, 12, 20, 22])).toBe(10);
    expect(halfTrendDelta([10, 12, 14])).toBeNull();
  });

  it("labels rounds by mode", () => {
    expect(roundShortLabel({ at: 1, levelId: 4, wpm: 20, accuracy: 95, score: 1, stars: 2 })).toBe(
      "M4",
    );
    expect(
      roundShortLabel({ at: 1, levelId: "focus", wpm: 20, accuracy: 95, score: 1, stars: 0 }),
    ).toBe("F");
  });

  it("builds best-per-level rows for unlocked missions", () => {
    const rows = bestLevelRows(
      { 1: { score: 100, wpm: 18, accuracy: 98 }, 3: { score: 80, wpm: 16, accuracy: 94 } },
      { 1: 3, 2: 1 },
      3,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ id: 1, stars: 3, wpm: 18, accuracy: 98 });
    expect(rows[1]).toMatchObject({ id: 2, stars: 1, wpm: null });
    expect(rows[2].title).toContain("Right");
  });

  it("formats trend deltas", () => {
    expect(formatTrendDelta(null, "wpm")).toContain("few more");
    expect(formatTrendDelta(3.2, "wpm")).toBe("+3 WPM vs earlier rounds");
    expect(formatTrendDelta(-1.4, "accuracy")).toBe("-1.4 pts vs earlier rounds");
    expect(formatTrendDelta(0.2, "accuracy")).toBe("Holding steady");
  });
});
