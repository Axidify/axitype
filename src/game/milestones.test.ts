import { describe, expect, it } from "vitest";
import { defaultProgress } from "../lib/storage";
import {
  buildDrillMilestone,
  buildMissionMilestone,
  campaignStarSummary,
  drillResultsKicker,
  gauntletGapStatus,
  missionResultsKicker,
  missionResultsStatus,
  retrainBadgeSummary,
} from "./milestones";

describe("milestones", () => {
  it("detects new three-star run", () => {
    const m = buildMissionMilestone({
      priorStars: 2,
      newStars: 3,
      priorBestScore: 100,
      runScore: 120,
      completed: true,
    });
    expect(m.newThreeStar).toBe(true);
    expect(missionResultsKicker(m, true, false, true)).toBe("Three stars");
  });

  it("detects star improvement without three stars", () => {
    const m = buildMissionMilestone({
      priorStars: 1,
      newStars: 2,
      priorBestScore: null,
      runScore: 80,
      completed: true,
    });
    expect(missionResultsKicker(m, true, false, true)).toBe("Star earned");
  });

  it("surfaces mission personal best", () => {
    const m = buildMissionMilestone({
      priorStars: 2,
      newStars: 2,
      priorBestScore: 500,
      runScore: 600,
      completed: true,
    });
    expect(m.newMissionBest).toBe(true);
    expect(missionResultsStatus(m, false, null)).toContain("New personal best");
  });

  it("celebrates newly earned drill badge", () => {
    const d = buildDrillMilestone("homeReturn", 4, false, true);
    expect(d.badgeNewlyEarned).toBe(true);
    expect(drillResultsKicker(d, true)).toBe("Form badge earned");
    expect(d.unlocksMissionId).toBe(5);
  });

  it("gauntlet gap copy when below PB", () => {
    expect(
      gauntletGapStatus(2, { wavesCleared: 5, totalScore: 1000, at: 0 }, false),
    ).toBe("3 waves short of your best (5 waves)");
  });

  it("campaign star summary", () => {
    const progress = defaultProgress();
    progress.levelStars = { 1: 3, 2: 2 };
    expect(campaignStarSummary(progress)).toBe("5 stars earned · 1 perfect run");
  });

  it("retrain badge summary with next drill", () => {
    const progress = defaultProgress();
    progress.track = "retrain";
    progress.unlockedLevel = 5;
    expect(retrainBadgeSummary(progress, false)).toContain("next: Home Return");
  });
});
