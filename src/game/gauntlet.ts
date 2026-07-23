import type { KeyStatMap } from "../lib/storage";
import { accuracyGate, getLevel, LEVELS, type LevelDef, type Track } from "./levels";
import { buildSessionPrompt, promptModeForLevel } from "./prompts";

/** Minimum campaign mission cleared before Gauntlet unlocks. */
export const GAUNTLET_UNLOCK_LEVEL = 5;

export interface GauntletWaveConfig {
  wave: number;
  keys: string;
  length: number;
  wpmLearn: number;
  wpmRetrain: number;
  timedSeconds?: number;
  eyesUp?: boolean;
  /** Campaign level mirrored for prompt mode / coaching thresholds. */
  effectiveLevel: number;
}

export interface GauntletRunState {
  wave: number;
  totalScore: number;
}

function extrapolateWpm(base: number, extra: number, step: number): number {
  return Math.round(base + extra * step);
}

function effectiveCampaignLevel(wave: number, unlockedLevel: number, demoMode: boolean): number {
  const cap = demoMode ? 12 : Math.min(unlockedLevel, 12);
  return Math.min(wave, cap);
}

export function gauntletAccuracyForWave(wave: number, track: Track): number {
  const base = accuracyGate(track);
  if (wave <= 12) return base;
  const extra = wave - 12;
  const bump = Math.floor(extra / 2) * 0.5;
  const cap = track === "retrain" ? 98 : 97;
  return Math.min(cap, Math.round((base + bump) * 10) / 10);
}

export function getGauntletWave(
  wave: number,
  unlockedLevel: number,
  demoMode = false,
): GauntletWaveConfig {
  const effectiveLevel = effectiveCampaignLevel(wave, unlockedLevel, demoMode);
  const level = getLevel(effectiveLevel);

  if (wave <= 12) {
    const ramp = 0.82 + (wave - 1) * 0.015;
    return {
      wave,
      keys: level.keys,
      length: Math.round(level.length * ramp),
      wpmLearn: level.wpmLearn,
      wpmRetrain: level.wpmRetrain,
      timedSeconds: level.timedSeconds,
      eyesUp: level.eyesUp,
      effectiveLevel,
    };
  }

  const apex = LEVELS[LEVELS.length - 1];
  const extra = wave - 12;
  let timedSeconds: number | undefined;
  if (extra >= 14) timedSeconds = 55;
  else if (extra >= 10) timedSeconds = 65;
  else if (extra >= 6) timedSeconds = 75;
  else if (extra >= 3) timedSeconds = 85;

  return {
    wave,
    keys: apex.keys,
    length: Math.min(240, apex.length + extra * 10),
    wpmLearn: extrapolateWpm(apex.wpmLearn, extra, 2),
    wpmRetrain: extrapolateWpm(apex.wpmRetrain, extra, 1),
    timedSeconds,
    eyesUp: extra >= 2 && extra % 3 === 0,
    effectiveLevel: 12,
  };
}

export function gauntletWpmTarget(wave: number, track: Track, unlockedLevel: number, demoMode = false): number {
  const config = getGauntletWave(wave, unlockedLevel, demoMode);
  return track === "retrain" ? config.wpmRetrain : config.wpmLearn;
}

export function gauntletWavePassed(
  completed: boolean,
  accuracy: number,
  wave: number,
  track: Track,
): boolean {
  if (!completed) return false;
  const gate = gauntletAccuracyForWave(wave, track);
  return accuracy >= gate;
}

export function wavesClearedAfterRun(wave: number, passed: boolean): number {
  return passed ? wave : Math.max(0, wave - 1);
}

export function buildGauntletPrompt(
  wave: number,
  unlockedLevel: number,
  stats: KeyStatMap | undefined,
  demoMode = false,
): string {
  const config = getGauntletWave(wave, unlockedLevel, demoMode);
  return buildSessionPrompt({
    mode: promptModeForLevel(config.effectiveLevel),
    keys: config.keys,
    targetLength: config.length,
    levelId: config.effectiveLevel,
    stats,
    preferAlternating: config.effectiveLevel >= 6,
    preferShort: Boolean(config.eyesUp),
  });
}

export function gauntletWaveAsLevel(
  wave: number,
  unlockedLevel: number,
  demoMode = false,
): LevelDef {
  const config = getGauntletWave(wave, unlockedLevel, demoMode);
  return {
    id: config.effectiveLevel,
    title: `Gauntlet wave ${wave}`,
    keys: config.keys,
    length: config.length,
    wpmLearn: config.wpmLearn,
    wpmRetrain: config.wpmRetrain,
    timedSeconds: config.timedSeconds,
    eyesUp: config.eyesUp,
  };
}

export function isGauntletUnlocked(unlockedLevel: number, demoMode: boolean): boolean {
  return demoMode || unlockedLevel >= GAUNTLET_UNLOCK_LEVEL;
}
