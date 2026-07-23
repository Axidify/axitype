import { describe, expect, it } from "vitest";
import { shouldPaceGate, tipForMiss } from "./coaching";
import { TypingEngine } from "./engine";
import { fingerForKey } from "./fingers";
import { generatePrompt, weakestKey } from "./prompts";
import { calcAccuracy, calcStars, calcWpm, scoreForCorrect } from "./scoring";
import { getLevel } from "./levels";

describe("scoring", () => {
  it("computes wpm and accuracy", () => {
    expect(calcWpm(50, 60000)).toBe(10);
    expect(calcAccuracy(9, 1)).toBe(90);
  });

  it("scores with combo", () => {
    expect(scoreForCorrect(1)).toBe(10);
    expect(scoreForCorrect(8)).toBe(80);
  });

  it("awards stars", () => {
    const level = getLevel(1);
    expect(calcStars(true, 100, 20, level, "learn")).toBe(3);
    expect(calcStars(true, 95, 5, level, "learn")).toBe(2);
    expect(calcStars(true, 80, 40, level, "learn")).toBe(1);
    expect(calcStars(false, 100, 40, level, "learn")).toBe(0);
  });
});

describe("fingers", () => {
  it("maps home keys", () => {
    expect(fingerForKey("a").id).toBe("LP");
    expect(fingerForKey("f").id).toBe("LI");
    expect(fingerForKey("j").id).toBe("RI");
    expect(fingerForKey(" ").id).toBe("RT");
  });
});

describe("coaching", () => {
  it("pace gates on poor recent accuracy", () => {
    const recent = Array(20).fill(false);
    expect(shouldPaceGate(recent)).toBe(true);
    expect(shouldPaceGate(Array(20).fill(true))).toBe(false);
  });

  it("rotates miss tips", () => {
    expect(tipForMiss(0).length).toBeGreaterThan(3);
  });
});

describe("prompts", () => {
  it("generates within charset", () => {
    const keys = "asdf";
    const text = generatePrompt({ keys, length: 30 });
    expect(text.length).toBeGreaterThan(0);
    for (const ch of text) expect(keys.includes(ch)).toBe(true);
  });

  it("picks weakest key from stats", () => {
    const weak = weakestKey(["a", "s"], {
      a: { hits: 10, misses: 0, meanLatencyMs: 100 },
      s: { hits: 5, misses: 8, meanLatencyMs: 400 },
    });
    expect(weak).toBe("s");
  });
});

describe("TypingEngine", () => {
  it("advances only on correct key", () => {
    const engine = new TypingEngine({ prompt: "ab" });
    engine.handleKey("x");
    let s = engine.getSnapshot();
    expect(s.index).toBe(0);
    expect(s.incorrect).toBe(1);
    expect(s.combo).toBe(1);

    engine.handleKey("a");
    s = engine.getSnapshot();
    expect(s.index).toBe(1);
    expect(s.correct).toBe(1);
    expect(s.combo).toBe(2);

    engine.handleKey("b");
    s = engine.getSnapshot();
    expect(s.finished).toBe(true);
    engine.dispose();
  });

  it("caps wpm samples", () => {
    const engine = new TypingEngine({ prompt: "a".repeat(5) });
    for (let i = 0; i < 5; i++) engine.handleKey("a");
    const s = engine.getSnapshot();
    expect(s.finished).toBe(true);
    expect(s.wpmSamples.length).toBeLessThanOrEqual(240);
    engine.dispose();
  });
});
