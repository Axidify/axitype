import { describe, expect, it } from "vitest";
import {
  analyzePasteText,
  filterToCharset,
  findUnknownChars,
  normalizePasteInput,
  preparePastePrompt,
} from "./pastePractice";

describe("pastePractice", () => {
  const keys = "asdfjkl; ";

  it("normalizes line breaks and tabs", () => {
    expect(normalizePasteInput("hello\r\nworld\tthere")).toBe("hello world there");
  });

  it("finds chars outside unlocked charset", () => {
    expect(findUnknownChars("abc123", keys)).toEqual(["1", "2", "3", "b", "c"]);
  });

  it("filters to charset and recounts removals", () => {
    const { filtered, removedCount } = filterToCharset("as df! jkl", keys);
    expect(filtered).toBe("as df jkl");
    expect(removedCount).toBe(1);
  });

  it("analyzes unknown keys and truncation", () => {
    const raw = "a".repeat(2100);
    const analysis = analyzePasteText(raw, keys);
    expect(analysis.unknownChars).toEqual([]);
    expect(analysis.truncated).toBe(true);
    expect(analysis.prompt.length).toBeLessThanOrEqual(2000);
  });

  it("rejects text that is too short after filtering", () => {
    const result = preparePastePrompt("!!!", keys);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/at least/i);
    }
  });

  it("accepts cleaned paste text", () => {
    const raw = "asdf jkl; ".repeat(3);
    const result = preparePastePrompt(raw, keys);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt.length).toBeGreaterThanOrEqual(12);
    }
  });
});
