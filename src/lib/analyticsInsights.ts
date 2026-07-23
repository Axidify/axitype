import type { AnalyticsEvent, DrillStartSource, RoundLevelId } from "./analytics";

export interface ModeCounters {
  started: number;
  completed: number;
  abandoned: number;
  restarted: number;
}

export interface AnalyticsTip {
  id: string;
  severity: "info" | "warn";
  title: string;
  detail: string;
}

export interface AnalyticsInsights {
  sampleSize: number;
  started: number;
  completedFull: number;
  completedPartial: number;
  abandoned: number;
  restarted: number;
  /** completedFull / (completedFull + abandoned); null if too few outcomes. */
  finishRate: number | null;
  drillBySource: Record<DrillStartSource, number>;
  topDrillSource: DrillStartSource | null;
  dailyPlays: number;
  uniqueDailyDays: number;
  switchesToRetrain: number;
  switchesToLearn: number;
  byMode: Partial<Record<string, ModeCounters>>;
  tips: AnalyticsTip[];
  /** Soft length bias for Focus accuracy prompts (chars). */
  focusAccuracyLength: number;
  /** Soft length bias for Daily prompts (chars). */
  dailyPromptLength: number;
}

const EMPTY_DRILLS: Record<DrillStartSource, number> = {
  hub: 0,
  stats: 0,
  results: 0,
};

function modeKey(levelId: RoundLevelId): string {
  return typeof levelId === "number" ? `mission:${levelId}` : levelId;
}

function ensureMode(
  map: Partial<Record<string, ModeCounters>>,
  key: string,
): ModeCounters {
  if (!map[key]) map[key] = { started: 0, completed: 0, abandoned: 0, restarted: 0 };
  return map[key]!;
}

export function summarizeAnalytics(events: AnalyticsEvent[]): AnalyticsInsights {
  const drillBySource = { ...EMPTY_DRILLS };
  const byMode: Partial<Record<string, ModeCounters>> = {};
  let started = 0;
  let completedFull = 0;
  let completedPartial = 0;
  let abandoned = 0;
  let restarted = 0;
  let dailyPlays = 0;
  const dailyDates = new Set<string>();
  let switchesToRetrain = 0;
  let switchesToLearn = 0;

  for (const ev of events) {
    if (ev.demoMode) continue;

    switch (ev.type) {
      case "roundStarted": {
        started += 1;
        ensureMode(byMode, modeKey(ev.levelId)).started += 1;
        break;
      }
      case "roundCompleted": {
        if (ev.completed && !ev.timedOut) {
          completedFull += 1;
          ensureMode(byMode, modeKey(ev.levelId)).completed += 1;
        } else {
          completedPartial += 1;
        }
        break;
      }
      case "roundAbandoned": {
        abandoned += 1;
        ensureMode(byMode, modeKey(ev.levelId)).abandoned += 1;
        break;
      }
      case "roundRestarted": {
        restarted += 1;
        ensureMode(byMode, modeKey(ev.levelId)).restarted += 1;
        break;
      }
      case "drillStarted": {
        drillBySource[ev.source] += 1;
        break;
      }
      case "dailyPlayed": {
        dailyPlays += 1;
        dailyDates.add(ev.date);
        break;
      }
      case "trackSwitched": {
        if (ev.to === "retrain") switchesToRetrain += 1;
        if (ev.to === "learn") switchesToLearn += 1;
        break;
      }
      default:
        break;
    }
  }

  const outcomes = completedFull + abandoned;
  const finishRate = outcomes >= 5 ? completedFull / outcomes : null;

  let topDrillSource: DrillStartSource | null = null;
  let topDrillCount = 0;
  for (const source of Object.keys(drillBySource) as DrillStartSource[]) {
    if (drillBySource[source] > topDrillCount) {
      topDrillCount = drillBySource[source];
      topDrillSource = source;
    }
  }
  if (topDrillCount === 0) topDrillSource = null;

  const focus = byMode.focus;
  const daily = byMode.daily;
  const focusRestarts = focus?.restarted ?? 0;
  const focusStarts = focus?.started ?? 0;
  const dailyRestarts = daily?.restarted ?? 0;
  const dailyStarts = daily?.started ?? 0;

  const focusAccuracyLength =
    focusStarts >= 4 && focusRestarts / focusStarts >= 0.4 ? 32 : 42;
  const dailyPromptLength =
    dailyStarts >= 4 && dailyRestarts / dailyStarts >= 0.4 ? 90 : 110;

  const tips = buildTips({
    finishRate,
    outcomes,
    abandoned,
    restarted,
    started,
    drillBySource,
    topDrillSource,
    dailyPlays,
    uniqueDailyDays: dailyDates.size,
    switchesToRetrain,
    focusStarts,
    focusRestarts,
    dailyStarts,
    dailyRestarts,
    focusAccuracyLength,
    dailyPromptLength,
  });

  return {
    sampleSize: events.filter((e) => !e.demoMode).length,
    started,
    completedFull,
    completedPartial,
    abandoned,
    restarted,
    finishRate,
    drillBySource,
    topDrillSource,
    dailyPlays,
    uniqueDailyDays: dailyDates.size,
    switchesToRetrain,
    switchesToLearn,
    byMode,
    tips,
    focusAccuracyLength,
    dailyPromptLength,
  };
}

function buildTips(input: {
  finishRate: number | null;
  outcomes: number;
  abandoned: number;
  restarted: number;
  started: number;
  drillBySource: Record<DrillStartSource, number>;
  topDrillSource: DrillStartSource | null;
  dailyPlays: number;
  uniqueDailyDays: number;
  switchesToRetrain: number;
  focusStarts: number;
  focusRestarts: number;
  dailyStarts: number;
  dailyRestarts: number;
  focusAccuracyLength: number;
  dailyPromptLength: number;
}): AnalyticsTip[] {
  const tips: AnalyticsTip[] = [];

  if (input.finishRate != null && input.finishRate < 0.55) {
    tips.push({
      id: "low-finish",
      severity: "warn",
      title: "Many rounds end early",
      detail: `Only ${Math.round(input.finishRate * 100)}% of started rounds finish cleanly. Try Daily or a short Practice sprint before tough missions.`,
    });
  }

  if (input.focusStarts >= 4 && input.focusRestarts / input.focusStarts >= 0.4) {
    tips.push({
      id: "focus-restarts",
      severity: "warn",
      title: "Focus is getting restarted a lot",
      detail:
        input.focusAccuracyLength < 42
          ? "Accuracy prompts are shortened automatically until Focus feels steadier."
          : "Restart Focus when needed — shorter accuracy prompts unlock after a few restarts.",
    });
  }

  if (input.dailyStarts >= 4 && input.dailyRestarts / input.dailyStarts >= 0.4) {
    tips.push({
      id: "daily-restarts",
      severity: "warn",
      title: "Daily runs restart often",
      detail:
        input.dailyPromptLength < 110
          ? "Today's Daily length is eased based on your restart pattern."
          : "A few more restarts will ease Daily length automatically.",
    });
  }

  const drillTotal =
    input.drillBySource.hub + input.drillBySource.stats + input.drillBySource.results;
  if (drillTotal >= 3 && input.drillBySource.stats === 0) {
    tips.push({
      id: "unused-stats-drill",
      severity: "info",
      title: "Stats rehab CTA unused",
      detail: "Miss heatmaps live in Stats — open it after a rough mission for a targeted drill.",
    });
  } else if (input.topDrillSource === "results" && drillTotal >= 3) {
    tips.push({
      id: "results-drills",
      severity: "info",
      title: "Rehab starts from Results",
      detail: "Most drills launch after a round — keep using miss coaching; Stats can catch patterns across windows.",
    });
  }

  if (input.uniqueDailyDays === 0 && input.started >= 6) {
    tips.push({
      id: "try-daily",
      severity: "info",
      title: "Daily is unused",
      detail: "One shared prompt per day builds a return habit without streaks or XP.",
    });
  } else if (input.uniqueDailyDays >= 2) {
    tips.push({
      id: "daily-habit",
      severity: "info",
      title: "Daily habit forming",
      detail: `Played Daily on ${input.uniqueDailyDays} different days — keep chasing today's best.`,
    });
  }

  if (input.switchesToRetrain === 0 && input.started >= 8) {
    tips.push({
      id: "try-retrain",
      severity: "info",
      title: "Retrain not tried yet",
      detail: "Retrain adds home checks, pace gates, and Form drills — better for breaking peeking habits.",
    });
  }

  if (tips.length === 0 && input.outcomes >= 5) {
    tips.push({
      id: "steady",
      severity: "info",
      title: "Play pattern looks steady",
      detail: "Finish rate is healthy. Keep mixing missions with Focus or Daily when a finger zone slips.",
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "need-data",
      severity: "info",
      title: "Need a bit more play",
      detail: "Insights unlock after a handful of non-demo rounds — keep typing.",
    });
  }

  return tips.slice(0, 4);
}

export function formatFinishRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}
