import { describe, expect, it } from "vitest";
import { defaultProgress } from "./storage";
import {
  parseBackupImport,
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

  it("imports profile bundles and full stores", () => {
    const profile = {
      id: "abc",
      name: "Alex",
      createdAt: 1,
      updatedAt: 2,
      progress: { ...defaultProgress(), unlockedLevel: 7 },
      analytics: [],
    };
    const profileRaw = JSON.stringify({
      schema: "axitype.profile",
      version: 1,
      exportedAt: 3,
      profile,
    });
    const profileResult = parseBackupImport(profileRaw);
    expect(profileResult.ok).toBe(true);
    if (!profileResult.ok || profileResult.mode !== "profile") return;
    expect(profileResult.progress.unlockedLevel).toBe(7);
    expect(profileResult.name).toBe("Alex");

    const storeRaw = JSON.stringify({
      schema: "axitype.profiles",
      version: 1,
      activeProfileId: "abc",
      profiles: [profile],
    });
    const storeResult = parseBackupImport(storeRaw);
    expect(storeResult.ok).toBe(true);
    if (!storeResult.ok || storeResult.mode !== "store") return;
    expect(storeResult.store.profiles[0]?.progress.unlockedLevel).toBe(7);
  });
});
