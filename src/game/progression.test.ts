import { describe, expect, it } from "vitest";
import { defaultProgress } from "../lib/storage";
import { formBadgeKey } from "../lib/storage";
import {
  drillGateFor,
  highlightedBlockingDrill,
  stageLocked,
} from "./progression";

describe("drillGateFor", () => {
  it("returns null for mission 1 and missions without a prior unlock drill", () => {
    expect(drillGateFor(1)).toBeNull();
    expect(drillGateFor(2)).toBeNull();
    expect(drillGateFor(3)).toBeNull();
  });

  it("maps mission 5 to homeReturn after mission 4", () => {
    const gate = drillGateFor(5);
    expect(gate).toEqual({
      kind: "homeReturn",
      afterLevel: 4,
      title: "Home Return",
    });
  });

  it("maps mission 8 to alternatingHands after mission 7", () => {
    expect(drillGateFor(8)?.kind).toBe("alternatingHands");
    expect(drillGateFor(8)?.afterLevel).toBe(7);
  });
});

describe("stageLocked", () => {
  it("is always open in demo mode", () => {
    const progress = defaultProgress();
    progress.track = "retrain";
    progress.unlockedLevel = 4;
    expect(stageLocked(progress, 5, true)).toBe(false);
  });

  it("is always open on learn track", () => {
    const progress = defaultProgress();
    progress.track = "learn";
    progress.unlockedLevel = 4;
    expect(stageLocked(progress, 5, false)).toBe(false);
  });

  it("locks drill-gated missions on retrain until the form badge is earned", () => {
    const progress = defaultProgress();
    progress.track = "retrain";
    progress.unlockedLevel = 5;
    expect(stageLocked(progress, 5, false)).toBe(true);

    progress.formBadges[formBadgeKey(4, "homeReturn")] = true;
    expect(stageLocked(progress, 5, false)).toBe(false);
  });

  it("does not lock missions without a drill gate", () => {
    const progress = defaultProgress();
    progress.track = "retrain";
    progress.unlockedLevel = 3;
    expect(stageLocked(progress, 3, false)).toBe(false);
  });
});

describe("highlightedBlockingDrill", () => {
  it("returns the first blocking drill the player can reach", () => {
    const progress = defaultProgress();
    progress.track = "retrain";
    progress.unlockedLevel = 4;
    expect(highlightedBlockingDrill(progress, false)).toBe("homeReturn");
  });

  it("returns null when no drill gate blocks progression", () => {
    const progress = defaultProgress();
    progress.track = "learn";
    progress.unlockedLevel = 4;
    expect(highlightedBlockingDrill(progress, false)).toBeNull();
  });

  it("returns null after the blocking badge is earned", () => {
    const progress = defaultProgress();
    progress.track = "retrain";
    progress.unlockedLevel = 4;
    progress.formBadges[formBadgeKey(4, "homeReturn")] = true;
    expect(highlightedBlockingDrill(progress, false)).toBeNull();
  });
});
