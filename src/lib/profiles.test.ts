import { describe, expect, it } from "vitest";
import { defaultProgress } from "./storage";
import {
  addProfile,
  createProfileRecord,
  createProfileStore,
  deleteProfile,
  getActiveAnalytics,
  getActiveProgress,
  getActiveProfile,
  MAX_PROFILES,
  migrateLegacyToProfileStore,
  normalizeProfileStore,
  renameProfile,
  setActiveAnalytics,
  setActiveProgress,
  switchActiveProfile,
} from "./profiles";

describe("profiles", () => {
  it("migrates legacy progress and analytics into Player", () => {
    const progress = { ...defaultProgress(), unlockedLevel: 5 };
    const analytics = [
      {
        type: "roundStarted" as const,
        at: 1,
        levelId: 1,
        track: "learn" as const,
        demoMode: false,
      },
    ];
    const store = migrateLegacyToProfileStore(
      JSON.stringify(progress),
      JSON.stringify(analytics),
      1_700_000_000_000,
    );
    expect(store.profiles).toHaveLength(1);
    expect(getActiveProfile(store).name).toBe("Player");
    expect(getActiveProgress(store).unlockedLevel).toBe(5);
    expect(getActiveAnalytics(store)).toHaveLength(1);
  });

  it("switches and isolates progress per profile", () => {
    const a = createProfileRecord("Amir", { ...defaultProgress(), unlockedLevel: 3 });
    const b = createProfileRecord("Sam", { ...defaultProgress(), unlockedLevel: 8 });
    let store = createProfileStore([a, b], a.id);
    store = setActiveProgress(store, { ...defaultProgress(), unlockedLevel: 4 });
    expect(getActiveProgress(store).unlockedLevel).toBe(4);

    const switched = switchActiveProfile(store, b.id);
    expect(switched.ok).toBe(true);
    if (!switched.ok) return;
    expect(getActiveProgress(switched.store).unlockedLevel).toBe(8);
  });

  it("creates, renames, and refuses deleting the last profile", () => {
    let store = createProfileStore([createProfileRecord("Player")]);
    const added = addProfile(store, "Kid");
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    store = added.store;
    expect(store.profiles).toHaveLength(2);

    const renamed = renameProfile(store, store.activeProfileId, "  Alex  ");
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(getActiveProfile(renamed.store).name).toBe("Alex");

    const deletedOne = deleteProfile(renamed.store, renamed.store.activeProfileId);
    expect(deletedOne.ok).toBe(true);
    if (!deletedOne.ok) return;
    expect(deletedOne.store.profiles).toHaveLength(1);

    const deletedLast = deleteProfile(deletedOne.store, deletedOne.store.profiles[0].id);
    expect(deletedLast.ok).toBe(false);
  });

  it("caps profile count", () => {
    let store = createProfileStore([createProfileRecord("P1")]);
    for (let i = 2; i <= MAX_PROFILES; i++) {
      const next = addProfile(store, `P${i}`);
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      store = next.store;
    }
    expect(addProfile(store, "Overflow").ok).toBe(false);
  });

  it("keeps analytics per profile", () => {
    const a = createProfileRecord("A");
    const b = createProfileRecord("B");
    let store = createProfileStore([a, b], a.id);
    store = setActiveAnalytics(store, [
      {
        type: "dailyPlayed",
        at: 1,
        date: "2026-07-24",
        track: "learn",
        demoMode: false,
      },
    ]);
    const switched = switchActiveProfile(store, b.id);
    expect(switched.ok).toBe(true);
    if (!switched.ok) return;
    expect(getActiveAnalytics(switched.store)).toHaveLength(0);
    const back = switchActiveProfile(switched.store, a.id);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(getActiveAnalytics(back.store)).toHaveLength(1);
  });

  it("normalizes a stored profile store", () => {
    const profile = createProfileRecord("Test", { ...defaultProgress(), unlockedLevel: 2 });
    const raw = {
      schema: "axitype.profiles",
      version: 1,
      activeProfileId: profile.id,
      profiles: [profile],
    };
    const store = normalizeProfileStore(raw);
    expect(store).not.toBeNull();
    expect(store?.profiles[0]?.progress.unlockedLevel).toBe(2);
  });
});
