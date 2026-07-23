import { paceGateCleared, shouldPaceGate, tipForMiss } from "./coaching";
import { calcAccuracy, calcWpm, nextCombo, scoreForCorrect } from "./scoring";

export interface EngineConfig {
  prompt: string;
  retrainPaceGate?: boolean;
  timedSeconds?: number;
}

export interface EngineSnapshot {
  prompt: string;
  index: number;
  correct: number;
  incorrect: number;
  combo: number;
  score: number;
  started: boolean;
  finished: boolean;
  timedOut: boolean;
  wpm: number;
  accuracy: number;
  wpmSamples: number[];
  target: string;
  lastMiss: boolean;
  missTip: string | null;
  paceGated: boolean;
  remainingMs: number | null;
  peeked: boolean;
}

export class TypingEngine {
  private prompt: string;
  private index = 0;
  private correct = 0;
  private incorrect = 0;
  private combo = 1;
  private score = 0;
  private startedAt: number | null = null;
  private lastKeyAt: number | null = null;
  private finished = false;
  private timedOut = false;
  private wpmSamples: number[] = [];
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private recent: boolean[] = [];
  private correctStreak = 0;
  private paceGated = false;
  private missTip: string | null = null;
  private missCount = 0;
  private lastMiss = false;
  private retrainPaceGate: boolean;
  private timedSeconds?: number;
  private peeked = false;
  private latencies: { key: string; ms: number; hit: boolean }[] = [];

  constructor(config: EngineConfig) {
    this.prompt = config.prompt;
    this.retrainPaceGate = Boolean(config.retrainPaceGate);
    this.timedSeconds = config.timedSeconds;
  }

  getSnapshot(now = performance.now()): EngineSnapshot {
    const elapsed = this.startedAt ? now - this.startedAt : 0;
    let remainingMs: number | null = null;
    if (this.timedSeconds && this.startedAt) {
      remainingMs = Math.max(0, this.timedSeconds * 1000 - elapsed);
    }
    return {
      prompt: this.prompt,
      index: this.index,
      correct: this.correct,
      incorrect: this.incorrect,
      combo: this.combo,
      score: this.score,
      started: this.startedAt !== null,
      finished: this.finished,
      timedOut: this.timedOut,
      wpm: calcWpm(this.correct, elapsed),
      accuracy: calcAccuracy(this.correct, this.incorrect),
      wpmSamples: [...this.wpmSamples],
      target: this.prompt[this.index] ?? "",
      lastMiss: this.lastMiss,
      missTip: this.missTip,
      paceGated: this.paceGated,
      remainingMs,
      peeked: this.peeked,
    };
  }

  startSampling(): void {
    this.stopSampling();
    this.sampleTimer = setInterval(() => {
      if (!this.startedAt || this.finished) return;
      const elapsed = performance.now() - this.startedAt;
      const wpm = calcWpm(this.correct, elapsed);
      this.wpmSamples.push(wpm);
      if (this.wpmSamples.length > 240) this.wpmSamples.shift();
      if (this.timedSeconds && elapsed >= this.timedSeconds * 1000) {
        this.timedOut = true;
        this.finished = true;
        this.stopSampling();
      }
    }, 250);
  }

  stopSampling(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
  }

  markPeeked(): void {
    this.peeked = true;
  }

  handleKey(raw: string, now = performance.now()): EngineSnapshot {
    if (this.finished) return this.getSnapshot(now);
    if (raw.length !== 1) return this.getSnapshot(now);

    if (!this.startedAt) {
      this.startedAt = now;
      this.lastKeyAt = now;
      this.startSampling();
    }

    const expected = this.prompt[this.index];
    const latency = this.lastKeyAt ? now - this.lastKeyAt : 0;
    this.lastKeyAt = now;

    if (raw === expected) {
      this.correct += 1;
      this.correctStreak += 1;
      this.recent.push(true);
      this.lastMiss = false;
      this.missTip = null;
      this.latencies.push({ key: expected, ms: latency, hit: true });

      if (this.paceGated && paceGateCleared(this.correctStreak)) {
        this.paceGated = false;
      }

      this.combo = nextCombo(this.combo, true, this.paceGated);
      if (!this.paceGated) {
        this.score += scoreForCorrect(this.combo);
      } else {
        this.score += 5;
      }

      this.index += 1;
      if (this.index >= this.prompt.length) {
        this.finished = true;
        this.stopSampling();
      }
    } else {
      this.incorrect += 1;
      this.correctStreak = 0;
      this.recent.push(false);
      this.lastMiss = true;
      this.missCount += 1;
      this.missTip = tipForMiss(this.missCount);
      this.combo = 1;
      this.latencies.push({ key: expected, ms: latency, hit: false });
      if (this.retrainPaceGate && shouldPaceGate(this.recent)) {
        this.paceGated = true;
      }
    }

    return this.getSnapshot(now);
  }

  consumeLatencies(): { key: string; ms: number; hit: boolean }[] {
    const out = this.latencies;
    this.latencies = [];
    return out;
  }

  dispose(): void {
    this.stopSampling();
  }
}
