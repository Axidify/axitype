import { describe, expect, it } from "vitest";
import {
  PACE_GATE_CLEAR_STREAK,
  PACE_GATE_MIN_SAMPLES,
  PACE_GATE_SCORE,
  PACE_GATE_THRESHOLD,
  PACE_GATE_WINDOW,
  paceGateCleared,
  recordAttempt,
  shouldPaceGate,
  tipForMiss,
} from "./coaching";
import { TypingEngine } from "./engine";
import { fingerForKey } from "./fingers";
import { generatePrompt, weakestKey } from "./prompts";
import { calcAccuracy, calcStars, calcWpm, scoreForCorrect } from "./scoring";
import { getLevel } from "./levels";

describe("scoring", () => {
  it("computes wpm and accuracy", () => {
    expect(calcWpm(50, 60000)).toBe(10);
    // 1 miss on a 10-char prompt → 90%; correct keys never raise it
    expect(calcAccuracy(0, 10)).toBe(100);
    expect(calcAccuracy(1, 10)).toBe(90);
    expect(calcAccuracy(2, 10)).toBe(80);
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

describe("TypingEngine accuracy grade", () => {
  it("accuracy only drops on misses", () => {
    const engine = new TypingEngine({ prompt: "abcd" });
    expect(engine.getSnapshot().accuracy).toBe(100);

    engine.handleKey("x");
    expect(engine.getSnapshot().accuracy).toBe(75);

    engine.handleKey("a");
    expect(engine.getSnapshot().accuracy).toBe(75);

    engine.handleKey("b");
    expect(engine.getSnapshot().accuracy).toBe(75);

    engine.handleKey("y");
    expect(engine.getSnapshot().accuracy).toBe(50);
    engine.dispose();
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
    const recent = Array(PACE_GATE_WINDOW).fill(false);
    expect(shouldPaceGate(recent)).toBe(true);
    expect(shouldPaceGate(Array(PACE_GATE_WINDOW).fill(true))).toBe(false);
  });

  it("waits for minimum samples before pace gating", () => {
    const recent = Array(PACE_GATE_MIN_SAMPLES - 1).fill(false);
    expect(shouldPaceGate(recent)).toBe(false);
    recent.push(false);
    expect(shouldPaceGate(recent)).toBe(true);
  });

  it("uses only the trailing window for pace gating", () => {
    const recent = [
      ...Array(PACE_GATE_WINDOW).fill(false),
      ...Array(PACE_GATE_WINDOW).fill(true),
    ];
    expect(shouldPaceGate(recent)).toBe(false);
  });

  it("gates at the accuracy threshold boundary", () => {
    const passing = Array(PACE_GATE_WINDOW).fill(false);
    const passingCorrect = Math.ceil(PACE_GATE_WINDOW * PACE_GATE_THRESHOLD);
    for (let i = 0; i < passingCorrect; i++) passing[i] = true;
    expect(shouldPaceGate(passing)).toBe(false);

    const failing = [...passing];
    failing[passingCorrect - 1] = false;
    expect(shouldPaceGate(failing)).toBe(true);
  });

  it("clears pace gate at the required streak", () => {
    expect(paceGateCleared(PACE_GATE_CLEAR_STREAK - 1)).toBe(false);
    expect(paceGateCleared(PACE_GATE_CLEAR_STREAK)).toBe(true);
  });

  it("caps recent attempts to the pace window", () => {
    const recent: boolean[] = [];
    for (let i = 0; i < PACE_GATE_WINDOW + 5; i++) recordAttempt(recent, true);
    expect(recent).toHaveLength(PACE_GATE_WINDOW);
    expect(recent.every(Boolean)).toBe(true);
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

describe("TypingEngine pace gate", () => {
  const prompt = "a".repeat(50);

  function floodMisses(engine: TypingEngine, count: number) {
    for (let i = 0; i < count; i++) engine.handleKey("!");
  }

  it("does not pace gate outside retrain mode", () => {
    const engine = new TypingEngine({ prompt, retrainPaceGate: false });
    floodMisses(engine, PACE_GATE_MIN_SAMPLES);
    expect(engine.getSnapshot().paceGated).toBe(false);
    engine.dispose();
  });

  it("triggers pace gate after sustained poor accuracy", () => {
    const engine = new TypingEngine({ prompt, retrainPaceGate: true });
    floodMisses(engine, PACE_GATE_MIN_SAMPLES);
    expect(engine.getSnapshot().paceGated).toBe(true);
    engine.dispose();
  });

  it("clears pace gate after a clean correct streak", () => {
    const engine = new TypingEngine({ prompt, retrainPaceGate: true });
    floodMisses(engine, PACE_GATE_MIN_SAMPLES);
    for (let i = 0; i < PACE_GATE_CLEAR_STREAK; i++) engine.handleKey("a");
    expect(engine.getSnapshot().paceGated).toBe(false);
    engine.dispose();
  });

  it("resets the clear streak on a miss while gated", () => {
    const engine = new TypingEngine({ prompt, retrainPaceGate: true });
    floodMisses(engine, PACE_GATE_MIN_SAMPLES);
    for (let i = 0; i < PACE_GATE_CLEAR_STREAK - 1; i++) engine.handleKey("a");
    engine.handleKey("!");
    engine.handleKey("a");
    expect(engine.getSnapshot().paceGated).toBe(true);
    engine.dispose();
  });

  it("awards reduced score while pace gated", () => {
    const engine = new TypingEngine({ prompt, retrainPaceGate: true });
    floodMisses(engine, PACE_GATE_MIN_SAMPLES);
    const scoreBefore = engine.getSnapshot().score;
    engine.handleKey("a");
    expect(engine.getSnapshot().score - scoreBefore).toBe(PACE_GATE_SCORE);
    engine.dispose();
  });

  it("pauses combo growth while pace gated", () => {
    const engine = new TypingEngine({ prompt, retrainPaceGate: true });
    floodMisses(engine, PACE_GATE_MIN_SAMPLES);
    const comboBefore = engine.getSnapshot().combo;
    engine.handleKey("a");
    expect(engine.getSnapshot().combo).toBe(comboBefore);
    engine.dispose();
  });
});
