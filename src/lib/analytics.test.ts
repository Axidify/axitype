import { describe, expect, it } from "vitest";
import {
  appendAnalyticsEvent,
  countAnalytics,
  type AnalyticsEvent,
} from "./analytics";

describe("analytics", () => {
  it("appends events and caps history", () => {
    let events: AnalyticsEvent[] = [];
    for (let i = 0; i < 5; i++) {
      events = appendAnalyticsEvent(
        events,
        {
          type: "roundStarted",
          levelId: i + 1,
          track: "learn",
          demoMode: false,
          at: i,
        },
        3,
      );
    }
    expect(events).toHaveLength(3);
    expect(events[0]?.at).toBe(2);
    expect(events[2]?.levelId).toBe(5);
  });

  it("counts by event type", () => {
    const events = appendAnalyticsEvent(
      [
        {
          type: "trackSwitched",
          at: 1,
          from: "learn",
          to: "retrain",
          track: "retrain",
          demoMode: false,
        },
      ],
      {
        type: "drillStarted",
        kind: "homeReturn",
        source: "stats",
        track: "learn",
        demoMode: false,
        at: 2,
      },
    );
    expect(countAnalytics(events, "drillStarted")).toBe(1);
    expect(countAnalytics(events, "roundAbandoned")).toBe(0);
  });
});
