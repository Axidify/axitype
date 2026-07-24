import { describe, expect, it } from "vitest";
import type { AnalyticsEvent } from "./analytics";
import { summarizeAnalytics, hubCoachingTip, missionGateCoaching } from "./analyticsInsights";

function base(partial: AnalyticsEvent): AnalyticsEvent {
  return { demoMode: false, track: "learn", at: 1, ...partial } as AnalyticsEvent;
}

describe("analyticsInsights", () => {
  it("computes finish rate and drill sources", () => {
    const events: AnalyticsEvent[] = [
      base({ type: "roundStarted", levelId: 1, track: "learn", demoMode: false, at: 1 }),
      base({
        type: "roundCompleted",
        levelId: 1,
        completed: true,
        timedOut: false,
        wpm: 20,
        accuracy: 96,
        track: "learn",
        demoMode: false,
        at: 2,
      }),
      base({ type: "roundStarted", levelId: 2, track: "learn", demoMode: false, at: 3 }),
      base({ type: "roundAbandoned", levelId: 2, track: "learn", demoMode: false, at: 4 }),
      base({ type: "roundStarted", levelId: 2, track: "learn", demoMode: false, at: 5 }),
      base({ type: "roundAbandoned", levelId: 2, track: "learn", demoMode: false, at: 6 }),
      base({ type: "roundStarted", levelId: 2, track: "learn", demoMode: false, at: 7 }),
      base({ type: "roundAbandoned", levelId: 2, track: "learn", demoMode: false, at: 8 }),
      base({ type: "roundStarted", levelId: 2, track: "learn", demoMode: false, at: 9 }),
      base({ type: "roundAbandoned", levelId: 2, track: "learn", demoMode: false, at: 10 }),
      base({
        type: "drillStarted",
        kind: "homeReturn",
        source: "results",
        track: "learn",
        demoMode: false,
        at: 11,
      }),
      base({
        type: "drillStarted",
        kind: "homeReturn",
        source: "results",
        track: "learn",
        demoMode: false,
        at: 12,
      }),
      base({
        type: "drillStarted",
        kind: "oneFinger",
        source: "hub",
        track: "learn",
        demoMode: false,
        at: 13,
      }),
    ];

    const insights = summarizeAnalytics(events);
    expect(insights.finishRate).toBeCloseTo(1 / 5);
    expect(insights.topDrillSource).toBe("results");
    expect(insights.tips.some((t) => t.id === "low-finish")).toBe(true);
  });

  it("shortens practice length after many practice restarts", () => {
    const events: AnalyticsEvent[] = [];
    for (let i = 0; i < 5; i++) {
      events.push(
        base({ type: "roundStarted", levelId: "practice", track: "learn", demoMode: false, at: i * 2 }),
      );
      events.push(
        base({
          type: "roundRestarted",
          levelId: "practice",
          track: "learn",
          demoMode: false,
          at: i * 2 + 1,
        }),
      );
    }
    const insights = summarizeAnalytics(events);
    expect(insights.practiceLengthScale).toBe(0.85);
    expect(insights.tips.some((t) => t.id === "practice-restarts")).toBe(true);
  });

  it("shortens focus length after many focus restarts", () => {
    const events: AnalyticsEvent[] = [];
    for (let i = 0; i < 5; i++) {
      events.push(
        base({ type: "roundStarted", levelId: "focus", track: "learn", demoMode: false, at: i * 2 }),
      );
      events.push(
        base({
          type: "roundRestarted",
          levelId: "focus",
          track: "learn",
          demoMode: false,
          at: i * 2 + 1,
        }),
      );
    }
    const insights = summarizeAnalytics(events);
    expect(insights.focusAccuracyLength).toBe(32);
    expect(insights.tips.some((t) => t.id === "focus-restarts")).toBe(true);
  });

  it("ignores demo events", () => {
    const insights = summarizeAnalytics([
      base({
        type: "roundAbandoned",
        levelId: 1,
        track: "learn",
        demoMode: true,
        at: 1,
      }),
    ]);
    expect(insights.abandoned).toBe(0);
    expect(insights.tips[0]?.id).toBe("need-data");
  });

  it("surfaces hub warn tip and mission coaching when finish rate is low", () => {
    const events: AnalyticsEvent[] = [];
    for (let i = 0; i < 6; i++) {
      events.push(base({ type: "roundStarted", levelId: 1, track: "learn", demoMode: false, at: i * 2 }));
      events.push(base({ type: "roundAbandoned", levelId: 1, track: "learn", demoMode: false, at: i * 2 + 1 }));
    }
    const insights = summarizeAnalytics(events);
    expect(hubCoachingTip(insights)?.id).toBe("low-finish");
    expect(missionGateCoaching(insights, true)).toContain("Practice sprint");
    expect(missionGateCoaching(insights, false)).toBeNull();
  });
});
