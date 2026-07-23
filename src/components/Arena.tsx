import { useEffect, useMemo, useRef, useState } from "react";
import { showHandDiagram, showHomeCheck } from "../game/coaching";
import { TypingEngine, type EngineSnapshot } from "../game/engine";
import { fingerForKey, type FingerId } from "../game/fingers";
import type { DrillKind, Track } from "../game/levels";
import { playComplete, playCorrect, playMiss } from "../lib/audio";
import type { ProgressState } from "../lib/storage";
import { FormCoachChrome } from "./FormCoachChrome";
import { HandDiagram } from "./HandDiagram";
import { HomeCheck } from "./HomeCheck";
import { Hud } from "./Hud";
import { Keyboard } from "./Keyboard";
import { LiveWpmChart } from "./charts/LiveWpmChart";
import { PromptLine } from "./PromptLine";
import styles from "./Arena.module.css";

export interface ArenaResult {
  snapshot: EngineSnapshot;
  title: string;
  levelId: number | "practice" | "paste" | "drill" | "gauntlet" | "focus" | "daily";
  drill?: DrillKind;
  keyEvents: { key: string; ms: number; hit: boolean }[];
}

interface ArenaProps {
  title: string;
  prompt: string;
  progress: ProgressState;
  levelId: number | "practice" | "paste" | "drill" | "gauntlet" | "focus" | "daily";
  drill?: DrillKind;
  lockFinger?: FingerId;
  eyesUp?: boolean;
  timedSeconds?: number;
  gauntletWave?: number;
  gauntletScore?: number;
  focusGoal?: string;
  focusReason?: string;
  demoMode?: boolean;
  onFinished: (result: ArenaResult) => void;
  onExit: () => void;
  /** Fresh start of the same challenge without returning to hub. */
  onRestart?: () => void;
}

export function Arena({
  title,
  prompt,
  progress,
  levelId,
  drill,
  lockFinger,
  eyesUp,
  timedSeconds,
  gauntletWave,
  gauntletScore,
  focusGoal,
  focusReason,
  demoMode,
  onFinished,
  onExit,
  onRestart,
}: ArenaProps) {
  const track: Track = progress.track;
  const formCoach = progress.coachPrefs.formCoach || track === "retrain";
  const numericLevel =
    typeof levelId === "number"
      ? levelId
      : levelId === "gauntlet" && gauntletWave
        ? Math.min(gauntletWave, progress.coachPrefs.demoMode ? 12 : progress.unlockedLevel)
        : 1;
  const needsHome = showHomeCheck(track, numericLevel, progress.coachPrefs.skipHomeAfter5);
  const [homeDone, setHomeDone] = useState(!needsHome);
  const [hideKeyboard, setHideKeyboard] = useState(Boolean(eyesUp));
  const [peekLeft, setPeekLeft] = useState(0);
  const [promptFlash, setPromptFlash] = useState<{ kind: "hit" | "miss"; id: number } | null>(
    null,
  );
  const [keyFlash, setKeyFlash] = useState<{ key: string; kind: "hit" | "miss"; id: number } | null>(
    null,
  );
  const engineRef = useRef<TypingEngine | null>(null);
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const [snap, setSnap] = useState<EngineSnapshot>(() => ({
    prompt,
    index: 0,
    correct: 0,
    incorrect: 0,
    combo: 1,
    score: 0,
    started: false,
    finished: false,
    timedOut: false,
    wpm: 0,
    accuracy: 100,
    wpmSamples: [],
    target: prompt[0] ?? "",
    lastMiss: false,
    missTip: null,
    paceGated: false,
    remainingMs: timedSeconds ? timedSeconds * 1000 : null,
    peeked: false,
  }));

  useEffect(() => {
    finishedRef.current = false;
    const engine = new TypingEngine({
      prompt,
      retrainPaceGate: track === "retrain",
      timedSeconds,
    });
    engineRef.current = engine;
    setSnap(engine.getSnapshot());
    setPromptFlash(null);
    setKeyFlash(null);
    const id = setInterval(() => {
      if (!engineRef.current) return;
      const s = engineRef.current.getSnapshot();
      setSnap(s);
      if (s.finished && !finishedRef.current) {
        finishedRef.current = true;
        playComplete();
        const events = engineRef.current?.consumeLatencies() ?? [];
        onFinishedRef.current({
          snapshot: s,
          title,
          levelId,
          drill,
          keyEvents: events,
        });
      }
    }, 100);
    return () => {
      clearInterval(id);
      engine.dispose();
    };
  }, [prompt, track, timedSeconds, title, levelId, drill]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  useEffect(() => {
    if (!homeDone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") return;
      if (e.key.length !== 1) return;
      e.preventDefault();
      const engine = engineRef.current;
      if (!engine) return;
      const next = engine.handleKey(e.key);
      setSnap(next);
      const id = Date.now();
      if (next.lastMiss) {
        setPromptFlash({ kind: "miss", id });
        setKeyFlash({ key: next.target, kind: "miss", id });
      } else if (next.started) {
        setPromptFlash({ kind: "hit", id });
        setKeyFlash({ key: e.key, kind: "hit", id });
      }
      if (progress.coachPrefs.sound) {
        if (next.lastMiss) playMiss();
        else if (next.started) playCorrect(next.combo);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [homeDone, onExit, progress.coachPrefs.sound]);

  useEffect(() => {
    if (!promptFlash) return;
    const t = setTimeout(() => setPromptFlash(null), 220);
    return () => clearTimeout(t);
  }, [promptFlash]);

  useEffect(() => {
    if (!keyFlash) return;
    const t = setTimeout(() => setKeyFlash(null), 140);
    return () => clearTimeout(t);
  }, [keyFlash]);

  useEffect(() => {
    if (!homeDone) return;
    const onSpace = (e: KeyboardEvent) => {
      if (e.code === "Space" && !engineRef.current?.getSnapshot().started) {
        // handled by typing space if prompt starts with space; else ignore
      }
    };
    window.addEventListener("keydown", onSpace);
    return () => window.removeEventListener("keydown", onSpace);
  }, [homeDone]);

  const activeFinger = useMemo(() => {
    if (lockFinger) return lockFinger;
    return snap.target ? fingerForKey(snap.target).id : undefined;
  }, [lockFinger, snap.target]);

  const showHands = showHandDiagram(track, numericLevel, formCoach);

  const startFromHome = () => setHomeDone(true);

  useEffect(() => {
    if (homeDone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        startFromHome();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [homeDone]);

  const peek = () => {
    engineRef.current?.markPeeked();
    setHideKeyboard(false);
    setPeekLeft(2);
  };

  useEffect(() => {
    if (peekLeft <= 0) return;
    const t = setTimeout(() => {
      setPeekLeft((p) => p - 1);
      if (peekLeft <= 1 && eyesUp) setHideKeyboard(true);
    }, 1000);
    return () => clearTimeout(t);
  }, [peekLeft, eyesUp]);

  return (
    <section className={styles.arena}>
      {demoMode && (
        <p className={styles.demoBanner}>Demo mode — results won&apos;t save</p>
      )}
      {!homeDone && (
        <HomeCheck retrain={track === "retrain"} onStart={startFromHome} />
      )}
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <button type="button" className={styles.back} onClick={onExit}>
            Exit
          </button>
          {onRestart && (
            <button type="button" className={styles.restart} onClick={onRestart}>
              Restart
            </button>
          )}
        </div>
        <h1>{title}</h1>
        {levelId === "gauntlet" && gauntletScore !== undefined && gauntletScore > 0 && (
          <span className={styles.gauntletScore}>Run {gauntletScore.toLocaleString()}</span>
        )}
        {eyesUp && hideKeyboard && (
          <button type="button" className={styles.peek} onClick={peek}>
            Peek 2s
          </button>
        )}
      </header>

      <Hud
        score={snap.score}
        combo={snap.combo}
        wpm={snap.wpm}
        accuracy={snap.accuracy}
        remainingMs={snap.remainingMs}
        paceGated={snap.paceGated}
        paceCoach={track === "retrain"}
      />

      {levelId === "focus" && focusGoal && (
        <div className={styles.focusCoach}>
          <p className={styles.focusGoal}>
            <strong>Goal:</strong> {focusGoal}
          </p>
          {focusReason && <p className={styles.focusReason}>{focusReason}</p>}
        </div>
      )}

      <LiveWpmChart data={snap.wpmSamples} live={!snap.finished} />

      <div
        className={`${styles.prompt} ${
          promptFlash?.kind === "hit"
            ? styles.promptHit
            : promptFlash?.kind === "miss"
              ? styles.promptMiss
              : ""
        }`}
        aria-live="polite"
      >
        <p className={`${styles.hint} ${snap.started ? styles.hintIdle : ""}`}>
          Press any key to start
        </p>
        <PromptLine prompt={snap.prompt} index={snap.index} lastMiss={snap.lastMiss} />
      </div>

      {formCoach && (
        <FormCoachChrome
          target={snap.target}
          activeFinger={activeFinger}
          missTip={snap.missTip}
        />
      )}

      <Keyboard
        target={snap.target}
        activeFinger={activeFinger}
        dimInactive={track === "retrain"}
        hidden={hideKeyboard}
        flashKey={keyFlash?.key ?? null}
        flashKind={keyFlash?.kind ?? "miss"}
      />

      {showHands && <HandDiagram active={activeFinger} />}
    </section>
  );
}
