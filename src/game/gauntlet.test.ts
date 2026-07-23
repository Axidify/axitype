import { describe, expect, it } from "vitest";
import {
  buildGauntletPrompt,
  gauntletWavePassed,
  getGauntletWave,
  wavesClearedAfterRun,
} from "./gauntlet";

describe("gauntlet", () => {
  it("scales waves beyond mission 12", () => {
    const w13 = getGauntletWave(13, 12);
    const w20 = getGauntletWave(20, 12);
    expect(w13.length).toBeGreaterThan(160);
    expect(w20.wpmLearn).toBeGreaterThan(w13.wpmLearn);
    expect(w20.length).toBeGreaterThan(w13.length);
    expect(w20.timedSeconds).toBeLessThanOrEqual(w13.timedSeconds ?? 999);
  });

  it("caps key set to unlocked campaign progress", () => {
    const w8 = getGauntletWave(8, 5);
    expect(w8.effectiveLevel).toBe(5);
    expect(w8.keys).toBe(getGauntletWave(5, 5).keys);
  });

  it("passes only when completed with enough accuracy", () => {
    expect(gauntletWavePassed(true, 95, 3, "learn")).toBe(true);
    expect(gauntletWavePassed(true, 90, 3, "learn")).toBe(false);
    expect(gauntletWavePassed(false, 100, 3, "learn")).toBe(false);
    expect(gauntletWavePassed(true, 96, 13, "retrain")).toBe(true);
    expect(gauntletWavePassed(true, 96, 15, "retrain")).toBe(false);
  });

  it("tracks waves cleared on fail", () => {
    expect(wavesClearedAfterRun(1, false)).toBe(0);
    expect(wavesClearedAfterRun(5, true)).toBe(5);
    expect(wavesClearedAfterRun(6, false)).toBe(5);
  });

  it("builds a non-empty prompt", () => {
    const text = buildGauntletPrompt(1, 5);
    expect(text.length).toBeGreaterThan(10);
  });
});
