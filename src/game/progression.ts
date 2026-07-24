import { formBadgeKey, type ProgressState } from "../lib/storage";
import { getDrill } from "./drills";
import { LEVELS, type DrillKind } from "./levels";

export interface DrillGateInfo {
  kind: DrillKind;
  afterLevel: number;
  title: string;
}

/** Retrain drill gate required before entering `levelId` (from the prior mission's unlock drill). */
export function drillGateFor(levelId: number): DrillGateInfo | null {
  if (levelId <= 1) return null;
  const prev = LEVELS[levelId - 2];
  if (!prev.unlockDrill) return null;
  const drill = getDrill(prev.unlockDrill);
  return { kind: prev.unlockDrill, afterLevel: prev.id, title: drill.title };
}

export function stageLocked(progress: ProgressState, levelId: number, demo: boolean): boolean {
  if (demo) return false;
  if (progress.track !== "retrain") return false;
  const gateInfo = drillGateFor(levelId);
  if (!gateInfo) return false;
  return !progress.formBadges[formBadgeKey(gateInfo.afterLevel, gateInfo.kind)];
}

/** Drill blocking the soonest drill-gated mission the player can unlock. */
export function highlightedBlockingDrill(
  progress: ProgressState,
  demo: boolean,
): DrillKind | null {
  if (demo || progress.track !== "retrain") return null;
  for (const level of LEVELS) {
    if (!stageLocked(progress, level.id, demo)) continue;
    const gateInfo = drillGateFor(level.id);
    if (!gateInfo) continue;
    if (progress.unlockedLevel >= gateInfo.afterLevel) return gateInfo.kind;
  }
  return null;
}
