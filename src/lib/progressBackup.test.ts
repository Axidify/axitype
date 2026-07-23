import { describe, expect, it } from "vitest";
import { defaultProgress } from "./storage";
import {
  parseProgressImport,
  serializeProgressExport,
} from "./progressBackup";

describe("progressBackup", () => {
  it("round-trips a full export", () => {
    const progress = {
      ...defaultProgress(),
      unlockedLevel: 4,
      levelStars: { 1: 3, 2: 2 },
      track: "retrain" as const,
    };
    const raw = serializeProgressExport(progress, 1_700_000_000_000);
    const result = parseProgressImport(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.progress.unlockedLevel).toBe(4);
    expect(result.progress.track).toBe("retrain");
    expect(result.progress.levelStars[1]).toBe(3);
  });

  it("accepts a bare progress object", () => {
    const result = parseProgressImport(JSON.stringify({ unlockedLevel: 6, track: "learn" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.progress.unlockedLevel).toBe(6);
    expect(result.progress.coachPrefs.sound).toBe(true);
  });

  it("rejects invalid JSON and bad schema versions", () => {
    expect(parseProgressImport("{").ok).toBe(false);
    expect(
      parseProgressImport(
        JSON.stringify({ schema: "axitype.progress", version: 99, progress: {} }),
      ).ok,
    ).toBe(false);
  });

  it("clamps unlocked level and merges coach prefs", () => {
    const result = parseProgressImport(
      JSON.stringify({
        unlockedLevel: 99,
        coachPrefs: { sound: false },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.progress.unlockedLevel).toBe(12);
    expect(result.progress.coachPrefs.sound).toBe(false);
    expect(result.progress.coachPrefs.formCoach).toBe(true);
  });
});
