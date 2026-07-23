import { describe, expect, it } from "vitest";
import { LEVELS } from "./levels";
import { charsetValid } from "./keyBias";
import { chunksForLevel, validateLevelChunks } from "./promptChunks";
import {
  buildSessionPrompt,
  generateAlternatingDrill,
  generateHomeReturnDrill,
  promptModeForLevel,
} from "./prompts";
import { filterSentences } from "./sentences";

describe("validateLevelChunks", () => {
  it("all curated chunks match their level charset", () => {
    expect(() => validateLevelChunks()).not.toThrow();
  });
});

describe("buildSessionPrompt", () => {
  it("uses pattern mode for early missions", () => {
    expect(promptModeForLevel(1)).toBe("pattern");
    expect(promptModeForLevel(4)).toBe("pattern");
    expect(promptModeForLevel(5)).toBe("pseudo");
    expect(promptModeForLevel(10)).toBe("sentence");
  });

  for (const level of LEVELS) {
    it(`level ${level.id} output stays within charset`, () => {
      const text = buildSessionPrompt({
        mode: promptModeForLevel(level.id),
        keys: level.keys,
        targetLength: level.length,
        levelId: level.id,
        preferAlternating: level.id >= 6,
        preferShort: Boolean(level.eyesUp),
      });
      expect(text.length).toBeGreaterThan(0);
      expect(charsetValid(text, level.keys)).toBe(true);
    });
  }

  it("pattern output includes spaced chunks on level 4", () => {
    const text = buildSessionPrompt({
      mode: "pattern",
      keys: "asdfjkl; ",
      targetLength: 40,
      levelId: 4,
    });
    expect(text).toMatch(/\s/);
  });

  it("sentence mode reads like words", () => {
    const text = buildSessionPrompt({
      mode: "sentence",
      keys: "abcdefghijklmnopqrstuvwxyz ",
      targetLength: 60,
    });
    expect(text.split(" ").length).toBeGreaterThan(2);
  });
});

describe("drill prompts", () => {
  it("home return uses spaced reach-home pairs", () => {
    const text = generateHomeReturnDrill("asdfjkl;ei ", 40);
    expect(text).toMatch(/\w\s\w/);
    expect(text).toContain("  ");
  });

  it("alternating hands uses two-letter pairs", () => {
    const text = generateAlternatingDrill("asdfjkl;qwertyuiop ", 32);
    const units = text.split(" ");
    expect(units.every((u) => u.length === 2)).toBe(true);
  });
});

describe("sentences", () => {
  it("filters to charset", () => {
    const pool = filterSentences("abcdefghijklmnopqrstuvwxyz ");
    expect(pool.length).toBeGreaterThan(0);
    for (const sentence of pool) {
      expect(charsetValid(sentence, "abcdefghijklmnopqrstuvwxyz ")).toBe(true);
    }
  });
});

describe("promptChunks", () => {
  it("level 1 chunks avoid spaces until space is unlocked", () => {
    for (const chunk of chunksForLevel(1)) {
      expect(charsetValid(chunk, "asl;")).toBe(true);
    }
  });
});
