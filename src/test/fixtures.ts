import type { EngineSnapshot } from "../game/engine";

export function baseSnapshot(overrides: Partial<EngineSnapshot> = {}): EngineSnapshot {
  return {
    prompt: "asdf",
    index: 4,
    correct: 4,
    incorrect: 0,
    combo: 1,
    score: 40,
    started: true,
    finished: true,
    timedOut: false,
    wpm: 42,
    accuracy: 100,
    wpmSamples: [10, 20, 42],
    target: "a",
    lastMiss: false,
    missTip: null,
    paceGated: false,
    remainingMs: null,
    peeked: false,
    ...overrides,
  };
}
