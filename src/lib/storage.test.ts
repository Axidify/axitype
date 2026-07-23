import { describe, expect, it } from "vitest";
import {
  aggregateMissCounts,
  defaultProgress,
  roundsForWindow,
  type RoundHistoryEntry,
} from "./storage";

function round(at: number, misses: Record<string, number>): RoundHistoryEntry {
  return {
    at,
    levelId: 1,
    wpm: 40,
    accuracy: 95,
    score: 100,
    stars: 2,
    missCounts: misses,
  };
}

describe("roundsForWindow", () => {
  const history = [1, 2, 3, 4, 5].map((n) => round(n, { a: n }));

  it("returns last 12 rounds", () => {
    expect(roundsForWindow(history, "recent12")).toHaveLength(5);
    expect(roundsForWindow(history, "recent12").at(-1)?.at).toBe(5);
  });

  it("filters to the last 7 days", () => {
    const now = 10_000_000;
    const recent = round(now - 1_000, { f: 1 });
    const old = round(now - 8 * 24 * 60 * 60 * 1000, { j: 1 });
    const filtered = roundsForWindow([old, recent], "week", now);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.missCounts).toEqual({ f: 1 });
  });
});

describe("aggregateMissCounts", () => {
  it("uses cumulative counts for all time", () => {
    const progress = {
      ...defaultProgress(),
      missCounts: { a: 10, s: 2 },
      roundHistory: [round(1, { a: 1 })],
    };
    expect(aggregateMissCounts(progress, "all")).toEqual({ a: 10, s: 2 });
  });

  it("aggregates per-round misses for recent windows", () => {
    const progress = {
      ...defaultProgress(),
      missCounts: { a: 99 },
      roundHistory: [round(1, { a: 2, s: 1 }), round(2, { a: 1 })],
    };
    expect(aggregateMissCounts(progress, "recent12")).toEqual({ a: 3, s: 1 });
  });
});
