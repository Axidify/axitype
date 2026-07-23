import type { DrillKind, Track } from "../game/levels";

export const ANALYTICS_KEY = "axitype.analytics.v1";
export const ANALYTICS_MAX_EVENTS = 200;

export type DrillStartSource = "stats" | "results" | "hub";

export type RoundLevelId = number | "practice" | "drill" | "gauntlet" | "focus";

type AnalyticsBase = {
  at: number;
  track: Track;
  demoMode: boolean;
};

export type AnalyticsEvent =
  | (AnalyticsBase & {
      type: "roundStarted";
      levelId: RoundLevelId;
      drill?: DrillKind;
    })
  | (AnalyticsBase & {
      type: "roundCompleted";
      levelId: RoundLevelId;
      drill?: DrillKind;
      completed: boolean;
      timedOut: boolean;
      wpm: number;
      accuracy: number;
    })
  | (AnalyticsBase & {
      type: "roundAbandoned";
      levelId: RoundLevelId;
      drill?: DrillKind;
    })
  | (AnalyticsBase & {
      type: "drillStarted";
      kind: DrillKind;
      source: DrillStartSource;
    })
  | (AnalyticsBase & {
      type: "trackSwitched";
      from: Track;
      to: Track;
    });

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type AnalyticsEventInput = DistributiveOmit<AnalyticsEvent, "at"> & { at?: number };

/** Pure append used by storage + tests. */
export function appendAnalyticsEvent(
  events: AnalyticsEvent[],
  input: AnalyticsEventInput,
  max = ANALYTICS_MAX_EVENTS,
): AnalyticsEvent[] {
  const next = { ...input, at: input.at ?? Date.now() } as AnalyticsEvent;
  const merged = [...events, next];
  return merged.length > max ? merged.slice(merged.length - max) : merged;
}

export function loadAnalytics(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveAnalytics(events: AnalyticsEvent[]): void {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
}

export function trackAnalytics(input: AnalyticsEventInput): void {
  try {
    const next = appendAnalyticsEvent(loadAnalytics(), input);
    saveAnalytics(next);
  } catch {
    // Ignore quota / private-mode failures — progress save is primary.
  }
}

export function clearAnalytics(): void {
  localStorage.removeItem(ANALYTICS_KEY);
}

export function countAnalytics(
  events: AnalyticsEvent[],
  type: AnalyticsEvent["type"],
): number {
  return events.filter((e) => e.type === type).length;
}
