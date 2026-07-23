import type { DrillKind, Track } from "../game/levels";
import {
  getActiveAnalytics,
  loadProfileStoreFromLocalStorage,
  saveProfileStoreToLocalStorage,
  setActiveAnalytics,
} from "./profiles";

export const ANALYTICS_KEY = "axitype.analytics.v1";
export const ANALYTICS_MAX_EVENTS = 200;

export type DrillStartSource = "stats" | "results" | "hub";

export type RoundLevelId = number | "practice" | "paste" | "drill" | "gauntlet" | "focus" | "daily";

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
      type: "roundRestarted";
      levelId: RoundLevelId;
      drill?: DrillKind;
    })
  | (AnalyticsBase & {
      type: "dailyPlayed";
      date: string;
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

/** Active profile analytics (lives inside `axitype.profiles.v1`). */
export function loadAnalytics(): AnalyticsEvent[] {
  return getActiveAnalytics(loadProfileStoreFromLocalStorage());
}

export function saveAnalytics(events: AnalyticsEvent[]): void {
  const store = loadProfileStoreFromLocalStorage();
  saveProfileStoreToLocalStorage(setActiveAnalytics(store, events));
}

export function trackAnalytics(input: AnalyticsEventInput): void {
  try {
    const store = loadProfileStoreFromLocalStorage();
    const next = appendAnalyticsEvent(getActiveAnalytics(store), input);
    saveProfileStoreToLocalStorage(setActiveAnalytics(store, next));
  } catch {
    // Ignore quota / private-mode failures — progress save is primary.
  }
}

export function clearAnalytics(): void {
  const store = loadProfileStoreFromLocalStorage();
  saveProfileStoreToLocalStorage(setActiveAnalytics(store, []));
}

export function countAnalytics(
  events: AnalyticsEvent[],
  type: AnalyticsEvent["type"],
): number {
  return events.filter((e) => e.type === type).length;
}
