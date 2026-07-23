let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playTone(
  freq: number,
  duration = 0.05,
  type: OscillatorType = "sine",
  gain = 0.04,
): void {
  const ac = getCtx();
  if (!ac) return;
  void ac.resume();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ac.destination);
  const now = ac.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

export function playCorrect(combo: number): void {
  playTone(420 + combo * 40, 0.04, "triangle", 0.035);
}

export function playMiss(): void {
  playTone(160, 0.08, "square", 0.03);
}

export function playComplete(): void {
  playTone(520, 0.08, "sine", 0.04);
  setTimeout(() => playTone(660, 0.1, "sine", 0.04), 80);
}
