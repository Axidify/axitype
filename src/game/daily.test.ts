import { describe, expect, it } from "vitest";
import {
  buildDailyPrompt,
  dailySeed,
  formatDailyLabel,
  isBetterDailyRun,
  localDateKey,
  todaysDailyBest,
} from "./daily";

describe("daily challenge", () => {
  it("formats a stable local date key", () => {
    expect(localDateKey(new Date(2026, 6, 24))).toBe("2026-07-24");
    expect(formatDailyLabel("2026-07-24")).toMatch(/Jul/);
  });

  it("builds the same prompt for the same date and keys", () => {
    const a = buildDailyPrompt("asdfjkl;qwerty ", undefined, "2026-07-24");
    const b = buildDailyPrompt("asdfjkl;qwerty ", undefined, "2026-07-24");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it("changes prompt when the date changes", () => {
    const a = buildDailyPrompt("asdfjkl;qwerty ", undefined, "2026-07-24");
    const b = buildDailyPrompt("asdfjkl;qwerty ", undefined, "2026-07-25");
    expect(a).not.toBe(b);
  });

  it("ranks daily bests by score then wpm", () => {
    expect(isBetterDailyRun({ score: 10, wpm: 20, accuracy: 90 }, null)).toBe(true);
    expect(
      isBetterDailyRun(
        { score: 100, wpm: 30, accuracy: 90 },
        { date: "2026-07-24", score: 80, wpm: 40, accuracy: 99, at: 1, attempts: 1 },
      ),
    ).toBe(true);
    expect(
      isBetterDailyRun(
        { score: 80, wpm: 45, accuracy: 90 },
        { date: "2026-07-24", score: 80, wpm: 40, accuracy: 99, at: 1, attempts: 1 },
      ),
    ).toBe(true);
  });

  it("only returns todays best for matching date", () => {
    expect(
      todaysDailyBest(
        { date: "2026-07-23", score: 1, wpm: 1, accuracy: 1, at: 1, attempts: 1 },
        "2026-07-24",
      ),
    ).toBeNull();
    expect(dailySeed("2026-07-24")).toBe(dailySeed("2026-07-24"));
  });
});
