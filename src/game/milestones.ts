import type { DailyBest } from "./daily";
import { DRILLS, getDrill, type DrillDef } from "./drills";
import type { DrillKind } from "./levels";
import { LEVELS } from "./levels";
import type { GauntletBest, ProgressState } from "../lib/storage";
import { formBadgeKey } from "../lib/storage";

export interface MissionMilestone {
  priorStars: number;
  newStars: number;
  starsImproved: boolean;
  newThreeStar: boolean;
  newMissionBest: boolean;
  priorBestScore: number | null;
}

export interface DrillMilestone {
  drillTitle: string;
  badgeNewlyEarned: boolean;
  unlocksMissionId: number | null;
}

export function buildMissionMilestone(input: {
  priorStars: number;
  newStars: number;
  priorBestScore: number | null;
  runScore: number;
  completed: boolean;
}): MissionMilestone {
  const { priorStars, newStars, priorBestScore, runScore, completed } = input;
  const starsImproved = completed && newStars > priorStars;
  const newThreeStar = starsImproved && newStars === 3;
  const newMissionBest =
    completed && (priorBestScore === null || runScore > priorBestScore);
  return {
    priorStars,
    newStars,
    starsImproved,
    newThreeStar,
    priorBestScore,
    newMissionBest,
  };
}

export function missionResultsKicker(
  milestone: MissionMilestone,
  completed: boolean,
  timedOut: boolean,
  unlockedEnough: boolean,
): string {
  if (!completed || timedOut) return "Round over";
  if (milestone.newThreeStar) return "Three stars";
  if (milestone.starsImproved) return "Star earned";
  if (unlockedEnough) return "Lane cleared";
  return "Round over";
}

export function missionResultsStatus(
  milestone: MissionMilestone,
  unlockedNext: boolean,
  nextHint: string | null,
): string | null {
  if (unlockedNext) return "Next mission unlocked";
  if (milestone.newMissionBest && milestone.priorBestScore !== null) {
    return `New personal best — was ${milestone.priorBestScore.toLocaleString()} score`;
  }
  if (milestone.newMissionBest) return "First personal best logged";
  if (milestone.starsImproved && milestone.priorStars > 0) {
    return `Improved ${"★".repeat(milestone.priorStars)}${"☆".repeat(3 - milestone.priorStars)} → ${"★".repeat(milestone.newStars)}${"☆".repeat(3 - milestone.newStars)}`;
  }
  return nextHint;
}

export function buildDrillMilestone(
  drill: DrillKind,
  afterLevel: number,
  wasEarned: boolean,
  completed: boolean,
): DrillMilestone {
  const def = getDrill(drill);
  return {
    drillTitle: def.title,
    badgeNewlyEarned: completed && !wasEarned,
    unlocksMissionId: afterLevel < 12 ? afterLevel + 1 : null,
  };
}

export function drillResultsKicker(milestone: DrillMilestone, completed: boolean): string {
  if (!completed) return "Round over";
  if (milestone.badgeNewlyEarned) return "Form badge earned";
  return "Drill done";
}

export function drillResultsStatus(
  milestone: DrillMilestone,
  completed: boolean,
  returnMissionTitle: string | null,
): string | null {
  if (!completed) return null;
  if (milestone.badgeNewlyEarned && milestone.unlocksMissionId) {
    return `Mission ${milestone.unlocksMissionId} unlocked on Retrain — ${milestone.drillTitle} badge saved`;
  }
  if (milestone.badgeNewlyEarned) {
    return `${milestone.drillTitle} Form badge saved`;
  }
  if (returnMissionTitle) return `Ready to retry ${returnMissionTitle}.`;
  return null;
}

export function gauntletGapStatus(
  cleared: number,
  best: GauntletBest | undefined,
  newBest: boolean,
): string | null {
  if (!best || newBest || cleared >= best.wavesCleared) return null;
  const gap = best.wavesCleared - cleared;
  return `${gap} wave${gap === 1 ? "" : "s"} short of your best (${best.wavesCleared} waves)`;
}

export function hubDailyBestLabel(best: DailyBest): string {
  return `${best.wpm} WPM · ${best.accuracy}%`;
}

export function hubGauntletBestLabel(best: GauntletBest): string {
  return `${best.wavesCleared} waves · ${best.totalScore.toLocaleString()} score`;
}

export function formBadgesEarned(progress: ProgressState): number {
  return DRILLS.filter((d) => progress.formBadges[formBadgeKey(d.afterLevel, d.kind)]).length;
}

export function nextRequiredDrill(progress: ProgressState, demo: boolean): DrillDef | null {
  if (demo || progress.track !== "retrain") return null;
  for (const level of LEVELS) {
    if (level.id > progress.unlockedLevel) break;
    if (level.id <= 1) continue;
    const prev = LEVELS[level.id - 2];
    if (!prev.unlockDrill) continue;
    const key = formBadgeKey(prev.id, prev.unlockDrill);
    if (!progress.formBadges[key]) return getDrill(prev.unlockDrill);
  }
  return null;
}

export function campaignStarSummary(progress: ProgressState): string | null {
  const values = Object.values(progress.levelStars);
  if (values.length === 0) return null;
  const total = values.reduce((sum, n) => sum + n, 0);
  const perfect = values.filter((n) => n === 3).length;
  const parts = [`${total} star${total === 1 ? "" : "s"} earned`];
  if (perfect > 0) parts.push(`${perfect} perfect run${perfect === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function retrainBadgeSummary(progress: ProgressState, demo: boolean): string | null {
  if (demo || progress.track !== "retrain") return null;
  const earned = formBadgesEarned(progress);
  const total = DRILLS.length;
  const next = nextRequiredDrill(progress, demo);
  if (earned >= total && !next) return `${earned}/${total} Form badges — all earned`;
  if (next) return `${earned}/${total} Form badges · next: ${next.title}`;
  return `${earned}/${total} Form badges`;
}
