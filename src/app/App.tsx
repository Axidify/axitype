import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arena, type ArenaResult } from "../components/Arena";
import { FocusGate, type FocusGateKind } from "../components/FocusGate";
import { LevelHub } from "../components/LevelHub";
import { Results } from "../components/Results";
import { Stats } from "../components/Stats";
import { buildDrillPrompt, getDrill } from "../game/drills";
import {
  buildGauntletPrompt,
  gauntletWavePassed,
  getGauntletWave,
  wavesClearedAfterRun,
  type GauntletRunState,
} from "../game/gauntlet";
import {
  buildFocusPlan,
  buildFocusPrompt,
  countFocusMisses,
  focusCoachGoal,
  focusHubPreview,
  focusRoundPassed,
  focusRoundTitle,
  focusSpeedTarget,
  FOCUS_MAX_SPEED_TIER,
  isFocusUnlocked,
  type FocusRunState,
} from "../game/focus";
import { getLevel, LEVELS, type DrillKind, type Track } from "../game/levels";
import { buildSessionPrompt, promptModeForLevel, promptModeForPractice } from "../game/prompts";
import { calcStars } from "../game/scoring";
import type { FingerId } from "../game/fingers";
import {
  aggregateMissCounts,
  formBadgeKey,
  loadProgress,
  saveProgress,
  updateKeyStat,
  type ProgressState,
} from "../lib/storage";
import {
  trackAnalytics,
  type DrillStartSource,
} from "../lib/analytics";
import {
  parseProgressImport,
  progressExportFilename,
  serializeProgressExport,
} from "../lib/progressBackup";
import styles from "./App.module.css";

type View = "hub" | "arena" | "results" | "stats" | "focusGate";

interface Session {
  title: string;
  prompt: string;
  levelId: number | "practice" | "drill" | "gauntlet" | "focus";
  drill?: DrillKind;
  drillAfterLevel?: number;
  /** Mission to resume after a rehab drill launched from Results. */
  returnToLevelId?: number;
  lockFinger?: FingerId;
  eyesUp?: boolean;
  timedSeconds?: number;
  gauntletRun?: GauntletRunState;
  focusRun?: FocusRunState;
  /** Bumps every start/retry so Arena remounts with a fresh run. */
  runId: number;
}

interface GauntletSummary {
  wavesCleared: number;
  totalScore: number;
  failedWave: number;
  newBest: boolean;
}

interface FocusGateState {
  run: FocusRunState;
  gate: FocusGateKind;
  lastAccuracy: number;
  lastWpm: number;
  lastFocusMisses: number;
}

interface FocusSummary {
  rounds: number;
  accuracyRounds: number;
  speedRounds: number;
  reason: string;
  focusTitle: string;
  fingerLabel: string;
  zone: string;
  lastAccuracy: number;
  lastWpm: number;
  targetWpm: number;
  lastFocusMisses: number;
}

function freshPrompt(build: () => string, avoid: string | null): string {
  let next = build();
  for (let i = 0; i < 20 && avoid && next === avoid; i++) {
    next = build();
  }
  // Tiny key pools can still collide — rotate as a last resort.
  if (avoid && next === avoid && next.length > 1) {
    next = next.slice(1) + next[0];
  }
  return next;
}

export default function App() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [view, setView] = useState<View>("hub");
  const [session, setSession] = useState<Session | null>(null);
  const [lastResult, setLastResult] = useState<ArenaResult | null>(null);
  const [lastStars, setLastStars] = useState(0);
  const [unlockedNext, setUnlockedNext] = useState(false);
  const [gauntletSummary, setGauntletSummary] = useState<GauntletSummary | null>(null);
  const [focusSummary, setFocusSummary] = useState<FocusSummary | null>(null);
  const [focusGate, setFocusGate] = useState<FocusGateState | null>(null);
  const runIdRef = useRef(0);
  const lastPromptRef = useRef<string | null>(null);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const unlockedKeys = useMemo(() => {
    if (progress.coachPrefs.demoMode) {
      return LEVELS[LEVELS.length - 1].keys;
    }
    const max = Math.min(progress.unlockedLevel, 12);
    const set = new Set<string>();
    for (const level of LEVELS) {
      if (level.id <= max) {
        for (const ch of level.keys) set.add(ch);
      }
    }
    return [...set].join("") || "asdf";
  }, [progress.unlockedLevel, progress.coachPrefs.demoMode]);

  const patchProgress = useCallback((fn: (p: ProgressState) => ProgressState) => {
    setProgress((p) => fn(p));
  }, []);

  const analyticsBase = () => ({
    track: progress.track,
    demoMode: progress.coachPrefs.demoMode,
  });

  const nextRunId = () => {
    runIdRef.current += 1;
    return runIdRef.current;
  };

  const startLevel = (id: number) => {
    const level = getLevel(id);
    const prompt = freshPrompt(
      () =>
        buildSessionPrompt({
          mode: promptModeForLevel(id),
          keys: level.keys,
          targetLength: level.length,
          levelId: id,
          stats: progress.keyStats,
          preferAlternating: id >= 6,
          preferShort: Boolean(level.eyesUp),
        }),
      lastPromptRef.current,
    );
    lastPromptRef.current = prompt;
    setSession({
      title: level.title,
      prompt,
      levelId: id,
      eyesUp: Boolean(level.eyesUp && progress.track === "retrain"),
      timedSeconds: level.timedSeconds,
      runId: nextRunId(),
    });
    trackAnalytics({ type: "roundStarted", levelId: id, ...analyticsBase() });
    setView("arena");
  };

  const startPractice = (timedSeconds?: number) => {
    const prompt = freshPrompt(
      () =>
        buildSessionPrompt({
          mode: promptModeForPractice(unlockedKeys),
          keys: unlockedKeys,
          targetLength: timedSeconds ? 200 : 100,
          stats: progress.keyStats,
          preferAlternating: true,
        }),
      lastPromptRef.current,
    );
    lastPromptRef.current = prompt;
    setSession({
      title: timedSeconds ? `Practice · ${timedSeconds}s` : "Practice lane",
      prompt,
      levelId: "practice",
      timedSeconds,
      runId: nextRunId(),
    });
    trackAnalytics({ type: "roundStarted", levelId: "practice", ...analyticsBase() });
    setView("arena");
  };

  const startGauntletWave = (wave: number, totalScore: number) => {
    const demo = progress.coachPrefs.demoMode;
    const config = getGauntletWave(wave, progress.unlockedLevel, demo);
    const prompt = freshPrompt(
      () => buildGauntletPrompt(wave, progress.unlockedLevel, progress.keyStats, demo),
      lastPromptRef.current,
    );
    lastPromptRef.current = prompt;
    setGauntletSummary(null);
    setSession({
      title: `Gauntlet · Wave ${wave}`,
      prompt,
      levelId: "gauntlet",
      gauntletRun: { wave, totalScore },
      eyesUp: Boolean(config.eyesUp && progress.track === "retrain"),
      timedSeconds: config.timedSeconds,
      runId: nextRunId(),
    });
    trackAnalytics({ type: "roundStarted", levelId: "gauntlet", ...analyticsBase() });
    setView("arena");
  };

  const startGauntlet = () => {
    startGauntletWave(1, 0);
  };

  const startFocusRound = (run: FocusRunState) => {
    const missCounts = aggregateMissCounts(progress, "recent12");
    const prompt = freshPrompt(
      () =>
        buildFocusPrompt(
          run.plan,
          run.phase,
          unlockedKeys,
          missCounts,
          progress.keyStats,
          run.speedTier,
        ),
      lastPromptRef.current,
    );
    lastPromptRef.current = prompt;
    setFocusSummary(null);
    setFocusGate(null);
    setSession({
      title: focusRoundTitle(run),
      prompt,
      levelId: "focus",
      focusRun: run,
      lockFinger: run.plan.lockFinger,
      eyesUp: run.plan.eyesUp,
      runId: nextRunId(),
    });
    trackAnalytics({ type: "roundStarted", levelId: "focus", ...analyticsBase() });
    setView("arena");
  };

  const startFocus = () => {
    const missCounts = aggregateMissCounts(progress, "recent12");
    const plan = buildFocusPlan(missCounts, progress.keyStats, unlockedKeys);
    const recentWpm = progress.roundHistory.slice(-12).map((r) => r.wpm);
    const targetWpm = focusSpeedTarget(progress.unlockedLevel, progress.track, recentWpm);
    startFocusRound({
      round: 1,
      phase: "accuracy",
      plan,
      targetWpm,
      speedTier: 1,
      accuracyRounds: 0,
      speedRounds: 0,
    });
  };

  const finishFocusSession = (
    run: FocusRunState,
    snapshot: ArenaResult["snapshot"],
    lastFocusMisses: number,
    result: ArenaResult,
  ) => {
    setLastStars(0);
    setUnlockedNext(false);
    setFocusSummary({
      rounds: run.accuracyRounds + run.speedRounds,
      accuracyRounds: run.accuracyRounds,
      speedRounds: run.speedRounds,
      reason: run.plan.reason,
      focusTitle: run.plan.title,
      fingerLabel: run.plan.fingerLabel,
      zone: run.plan.zone,
      lastAccuracy: snapshot.accuracy,
      lastWpm: snapshot.wpm,
      targetWpm: run.targetWpm,
      lastFocusMisses,
    });
    setLastResult(result);
    setView("results");
  };

  const openFocusGate = (
    run: FocusRunState,
    gate: FocusGateKind,
    snapshot: ArenaResult["snapshot"],
    lastFocusMisses: number,
    result: ArenaResult,
  ) => {
    setSession(null);
    setLastResult(result);
    setFocusGate({
      run,
      gate,
      lastAccuracy: snapshot.accuracy,
      lastWpm: snapshot.wpm,
      lastFocusMisses,
    });
    setView("focusGate");
  };

  const progressFromFocusGate = () => {
    if (!focusGate) return;
    const { run, gate } = focusGate;
    const recentWpm = progress.roundHistory.slice(-12).map((r) => r.wpm);
    setFocusGate(null);

    if (gate === "accuracyToSpeed") {
      startFocusRound({
        ...run,
        phase: "speed",
        round: 1,
        speedRounds: 0,
        speedTier: 1,
        targetWpm: focusSpeedTarget(progress.unlockedLevel, progress.track, recentWpm, 1),
      });
      return;
    }

    if (run.speedTier >= FOCUS_MAX_SPEED_TIER && lastResult) {
      finishFocusSession(run, lastResult.snapshot, focusGate.lastFocusMisses, lastResult);
      return;
    }

    const nextTier = run.speedTier + 1;
    startFocusRound({
      ...run,
      phase: "speed",
      round: 1,
      speedTier: nextTier,
      targetWpm: focusSpeedTarget(progress.unlockedLevel, progress.track, recentWpm, nextTier),
    });
  };

  const practiceFromFocusGate = () => {
    if (!focusGate) return;
    const { run, gate } = focusGate;
    setFocusGate(null);

    if (gate === "accuracyToSpeed") {
      startFocusRound({
        ...run,
        phase: "accuracy",
        round: 1,
      });
      return;
    }

    startFocusRound({
      ...run,
      phase: "speed",
      round: 1,
    });
  };

  const recordRoundProgress = (
    levelId: Session["levelId"],
    snapshot: ArenaResult["snapshot"],
    keyEvents: ArenaResult["keyEvents"],
    drill?: DrillKind,
    gauntletWave?: number,
    focusRound?: number,
  ) => {
    if (progress.coachPrefs.demoMode) return;

    setProgress((p) => {
      const next: ProgressState = {
        ...p,
        keyStats: { ...p.keyStats },
        missCounts: { ...p.missCounts },
        levelStars: { ...p.levelStars },
        bestByLevel: { ...p.bestByLevel },
        formBadges: { ...p.formBadges },
      };

      const roundMisses: Record<string, number> = {};
      for (const ev of keyEvents) {
        next.keyStats = updateKeyStat(next.keyStats, ev.key, ev.hit, ev.ms);
        if (!ev.hit) {
          next.missCounts[ev.key] = (next.missCounts[ev.key] ?? 0) + 1;
          roundMisses[ev.key] = (roundMisses[ev.key] ?? 0) + 1;
        }
      }

      if (typeof levelId === "number") {
        const level = getLevel(levelId);
        const stars = calcStars(
          snapshot.finished && !snapshot.timedOut,
          snapshot.accuracy,
          snapshot.wpm,
          level,
          p.track,
          snapshot.peeked,
        );
        next.levelStars[levelId] = Math.max(next.levelStars[levelId] ?? 0, stars);
        const best = next.bestByLevel[levelId];
        if (!best || snapshot.score > best.score) {
          next.bestByLevel[levelId] = {
            score: snapshot.score,
            wpm: snapshot.wpm,
            accuracy: snapshot.accuracy,
          };
        }
        if (stars >= 2 && levelId >= p.unlockedLevel && levelId < 12) {
          next.unlockedLevel = levelId + 1;
        }
        if (level.id >= 5) {
          next.coachPrefs = { ...next.coachPrefs, skipHomeAfter5: true };
        }

        next.roundHistory = [
          ...next.roundHistory,
          {
            at: Date.now(),
            levelId,
            wpm: snapshot.wpm,
            accuracy: snapshot.accuracy,
            score: snapshot.score,
            stars,
            missCounts: roundMisses,
          },
        ].slice(-40);
      } else if (levelId === "drill" && drill) {
        const after = session?.drillAfterLevel ?? 1;
        next.formBadges[formBadgeKey(after, drill)] = true;
        next.roundHistory = [
          ...next.roundHistory,
          {
            at: Date.now(),
            levelId,
            drill,
            wpm: snapshot.wpm,
            accuracy: snapshot.accuracy,
            score: snapshot.score,
            stars: snapshot.finished && !snapshot.timedOut ? 1 : 0,
            missCounts: roundMisses,
          },
        ].slice(-40);
      } else if (levelId === "gauntlet") {
        next.roundHistory = [
          ...next.roundHistory,
          {
            at: Date.now(),
            levelId,
            gauntletWave,
            wpm: snapshot.wpm,
            accuracy: snapshot.accuracy,
            score: snapshot.score,
            stars: 0,
            missCounts: roundMisses,
          },
        ].slice(-40);
      } else if (levelId === "focus") {
        next.roundHistory = [
          ...next.roundHistory,
          {
            at: Date.now(),
            levelId,
            focusRound,
            drill,
            wpm: snapshot.wpm,
            accuracy: snapshot.accuracy,
            score: snapshot.score,
            stars: 0,
            missCounts: roundMisses,
          },
        ].slice(-40);
      } else {
        next.roundHistory = [
          ...next.roundHistory,
          {
            at: Date.now(),
            levelId,
            wpm: snapshot.wpm,
            accuracy: snapshot.accuracy,
            score: snapshot.score,
            stars: 0,
            missCounts: roundMisses,
          },
        ].slice(-40);
      }

      return next;
    });
  };

  const startDrill = (
    kind: DrillKind,
    afterLevel: number,
    missCountsOverride?: Record<string, number>,
    returnToLevelId?: number,
    source: DrillStartSource = "hub",
  ) => {
    const keyLevel = progress.coachPrefs.demoMode ? afterLevel : Math.min(afterLevel, progress.unlockedLevel);
    const level = getLevel(keyLevel);
    const def = getDrill(kind);
    const misses = missCountsOverride ?? progress.missCounts;
    let built = buildDrillPrompt(kind, level.keys, misses, progress.keyStats);
    const prompt = freshPrompt(() => {
      built = buildDrillPrompt(kind, level.keys, misses, progress.keyStats);
      return built.prompt;
    }, lastPromptRef.current);
    lastPromptRef.current = prompt;
    setSession({
      title: def.title,
      prompt,
      levelId: "drill",
      drill: kind,
      drillAfterLevel: afterLevel,
      returnToLevelId,
      lockFinger: built.lockFinger,
      eyesUp: built.eyesUp,
      runId: nextRunId(),
    });
    trackAnalytics({ type: "drillStarted", kind, source, ...analyticsBase() });
    trackAnalytics({ type: "roundStarted", levelId: "drill", drill: kind, ...analyticsBase() });
    setView("arena");
  };

  const exitArena = () => {
    if (session) {
      trackAnalytics({
        type: "roundAbandoned",
        levelId: session.levelId,
        drill: session.drill,
        ...analyticsBase(),
      });
    }
    setView("hub");
  };

  const restartArena = () => {
    if (!session) return;
    trackAnalytics({
      type: "roundAbandoned",
      levelId: session.levelId,
      drill: session.drill,
      ...analyticsBase(),
    });

    if (session.levelId === "gauntlet") {
      startGauntlet();
      return;
    }
    if (session.levelId === "focus" && session.focusRun) {
      startFocusRound({ ...session.focusRun });
      return;
    }
    if (session.levelId === "practice") {
      startPractice(session.timedSeconds);
      return;
    }
    if (session.levelId === "drill" && session.drill && session.drillAfterLevel != null) {
      startDrill(
        session.drill,
        session.drillAfterLevel,
        undefined,
        session.returnToLevelId,
        "hub",
      );
      return;
    }
    if (typeof session.levelId === "number") {
      startLevel(session.levelId);
    }
  };

  const canRestartChallenge =
    session != null &&
    (session.levelId === "gauntlet" ||
      session.levelId === "focus" ||
      (session.levelId === "practice" && Boolean(session.timedSeconds)));

  const applyResult = (result: ArenaResult) => {
    const { snapshot, levelId, drill, keyEvents } = result;
    const completed = snapshot.finished && !snapshot.timedOut;

    trackAnalytics({
      type: "roundCompleted",
      levelId,
      drill,
      completed,
      timedOut: snapshot.timedOut,
      wpm: snapshot.wpm,
      accuracy: snapshot.accuracy,
      ...analyticsBase(),
    });

    if (levelId === "gauntlet" && session?.gauntletRun) {
      const { wave, totalScore } = session.gauntletRun;
      const demo = progress.coachPrefs.demoMode;
      const passed = gauntletWavePassed(
        completed,
        snapshot.accuracy,
        wave,
        progress.track,
      );
      const runScore = totalScore + snapshot.score;

      recordRoundProgress(levelId, snapshot, keyEvents, undefined, wave);

      if (passed) {
        startGauntletWave(wave + 1, runScore);
        return;
      }

      const cleared = wavesClearedAfterRun(wave, false);
      let newBest = false;

      if (!demo) {
        const prev = progress.gauntletBest;
        newBest = !prev || cleared > prev.wavesCleared || (cleared === prev.wavesCleared && runScore > prev.totalScore);
        if (newBest) {
          setProgress((p) => ({
            ...p,
            gauntletBest: { wavesCleared: cleared, totalScore: runScore, at: Date.now() },
          }));
        }
      }

      setLastStars(0);
      setUnlockedNext(false);
      setGauntletSummary({
        wavesCleared: cleared,
        totalScore: runScore,
        failedWave: wave,
        newBest,
      });
      setLastResult(result);
      setView("results");
      return;
    }

    if (levelId === "focus" && session?.focusRun) {
      const run = session.focusRun;
      const passed = focusRoundPassed(
        completed,
        snapshot.accuracy,
        snapshot.wpm,
        progress.track,
        keyEvents,
        run.plan,
        run.phase,
        run.targetWpm,
      );
      const lastFocusMisses = countFocusMisses(keyEvents, run.plan);

      if (!progress.coachPrefs.demoMode && passed) {
        recordRoundProgress(
          levelId,
          snapshot,
          keyEvents,
          run.plan.kind,
          undefined,
          run.round,
        );
      }

      if (passed) {
        if (run.phase === "accuracy") {
          openFocusGate(
            { ...run, accuracyRounds: run.round },
            "accuracyToSpeed",
            snapshot,
            lastFocusMisses,
            result,
          );
          return;
        }

        openFocusGate(
          { ...run, speedRounds: run.round },
          "speedTier",
          snapshot,
          lastFocusMisses,
          result,
        );
        return;
      }

      startFocusRound({
        ...run,
        round: run.round + 1,
      });
      return;
    }

    let stars = 0;
    let unlocked = false;

    if (typeof levelId === "number") {
      const level = getLevel(levelId);
      stars = calcStars(
        completed,
        snapshot.accuracy,
        snapshot.wpm,
        level,
        progress.track,
        snapshot.peeked,
      );
      if (!progress.coachPrefs.demoMode && stars >= 2 && levelId >= progress.unlockedLevel && levelId < 12) {
        unlocked = true;
      }
    } else if (levelId === "drill" && drill) {
      stars = completed ? 1 : 0;
    }

    setLastStars(stars);
    setUnlockedNext(unlocked);
    setLastResult(result);

    if (progress.coachPrefs.demoMode) {
      setView("results");
      return;
    }

    recordRoundProgress(levelId, snapshot, keyEvents, drill);

    setView("results");
  };

  const nextLevelId = useMemo(() => {
    if (!lastResult) return null;
    const completed = lastResult.snapshot.finished && !lastResult.snapshot.timedOut;
    if (typeof lastResult.levelId !== "number" || !completed || lastResult.levelId >= 12) {
      return null;
    }
    const next = lastResult.levelId + 1;
    return next <= progress.unlockedLevel ? next : null;
  }, [lastResult, progress.unlockedLevel]);

  const focusPreview = useMemo(() => {
    if (!isFocusUnlocked(progress.unlockedLevel, progress.coachPrefs.demoMode)) return null;
    const missCounts = aggregateMissCounts(progress, "recent12");
    return focusHubPreview(missCounts, progress.keyStats, unlockedKeys);
  }, [progress, unlockedKeys]);

  const recentFocusWpm = useMemo(
    () => progress.roundHistory.slice(-12).map((r) => r.wpm),
    [progress.roundHistory],
  );

  return (
    <div className={styles.shell}>
      {view === "hub" && (
        <LevelHub
          progress={progress}
          onTrack={(track: Track) => {
            if (track !== progress.track) {
              trackAnalytics({
                type: "trackSwitched",
                from: progress.track,
                to: track,
                track,
                demoMode: progress.coachPrefs.demoMode,
              });
            }
            patchProgress((p) => ({
              ...p,
              track,
              coachPrefs: {
                ...p.coachPrefs,
                formCoach: track === "retrain" ? true : p.coachPrefs.formCoach,
              },
            }));
          }}
          onPlayLevel={startLevel}
          onPractice={startPractice}
          onGauntlet={startGauntlet}
          onFocus={startFocus}
          focusPreview={focusPreview}
          onStats={() => setView("stats")}
          onDrill={(kind, afterLevel) => startDrill(kind, afterLevel, undefined, undefined, "hub")}
          onToggleFormCoach={() =>
            patchProgress((p) => ({
              ...p,
              coachPrefs: { ...p.coachPrefs, formCoach: !p.coachPrefs.formCoach },
            }))
          }
          onToggleSound={() =>
            patchProgress((p) => ({
              ...p,
              coachPrefs: { ...p.coachPrefs, sound: !p.coachPrefs.sound },
            }))
          }
          onToggleDemoMode={() =>
            patchProgress((p) => ({
              ...p,
              coachPrefs: { ...p.coachPrefs, demoMode: !p.coachPrefs.demoMode },
            }))
          }
          onDismissTrackExplainer={() =>
            patchProgress((p) => ({
              ...p,
              coachPrefs: { ...p.coachPrefs, seenTrackExplainer: true },
            }))
          }
          onDismissRetrainIntro={() =>
            patchProgress((p) => ({
              ...p,
              coachPrefs: { ...p.coachPrefs, seenRetrainIntro: true },
            }))
          }
        />
      )}

      {view === "arena" && session && (
        <Arena
          key={session.runId}
          title={session.title}
          prompt={session.prompt}
          progress={progress}
          levelId={session.levelId}
          drill={session.drill}
          lockFinger={session.lockFinger}
          eyesUp={session.eyesUp}
          timedSeconds={session.timedSeconds}
          gauntletWave={session.gauntletRun?.wave}
          gauntletScore={session.gauntletRun?.totalScore}
          focusGoal={session.focusRun ? focusCoachGoal(session.focusRun) : undefined}
          focusReason={session.focusRun?.plan.reason}
          demoMode={progress.coachPrefs.demoMode}
          onFinished={applyResult}
          onExit={exitArena}
          onRestart={canRestartChallenge ? restartArena : undefined}
        />
      )}

      {view === "focusGate" && focusGate && (
        <FocusGate
          run={focusGate.run}
          gate={focusGate.gate}
          track={progress.track}
          unlockedLevel={progress.unlockedLevel}
          recentWpm={recentFocusWpm}
          lastAccuracy={focusGate.lastAccuracy}
          lastWpm={focusGate.lastWpm}
          lastFocusMisses={focusGate.lastFocusMisses}
          onProgress={progressFromFocusGate}
          onPracticeAgain={practiceFromFocusGate}
          onExit={() => {
            setFocusGate(null);
            setView("hub");
          }}
        />
      )}

      {view === "results" && lastResult && (
        <Results
          title={lastResult.title}
          snapshot={lastResult.snapshot}
          levelId={lastResult.levelId}
          drill={lastResult.drill}
          track={progress.track}
          stars={lastStars}
          unlockedNext={unlockedNext}
          nextLevelId={progress.coachPrefs.demoMode ? null : nextLevelId}
          demoMode={progress.coachPrefs.demoMode}
          unlockedLevel={progress.unlockedLevel}
          keyEvents={lastResult.keyEvents}
          onRetry={() => {
            if (lastResult.levelId === "gauntlet") startGauntlet();
            else if (lastResult.levelId === "focus") startFocus();
            else if (typeof lastResult.levelId === "number") startLevel(lastResult.levelId);
            else if (lastResult.drill && session?.drillAfterLevel)
              startDrill(
                lastResult.drill,
                session.drillAfterLevel,
                undefined,
                session.returnToLevelId,
                "results",
              );
            else startPractice(session?.timedSeconds);
          }}
          onNext={startLevel}
          onHub={() => setView("hub")}
          gauntletSummary={gauntletSummary}
          gauntletBest={progress.gauntletBest}
          focusSummary={focusSummary}
          returnToLevelId={
            lastResult.levelId === "drill" ? session?.returnToLevelId ?? null : null
          }
          onReturnToMission={(id) => startLevel(id)}
          onSuggestedDrill={(kind, afterLevel, missCounts) =>
            startDrill(
              kind,
              afterLevel,
              missCounts,
              typeof lastResult.levelId === "number" ? lastResult.levelId : undefined,
              "results",
            )
          }
        />
      )}

      {view === "stats" && (
        <Stats
          progress={progress}
          onBack={() => setView("hub")}
          onSuggestedDrill={(kind, afterLevel, missCounts) =>
            startDrill(kind, afterLevel, missCounts, undefined, "stats")
          }
          onExportProgress={() => {
            const blob = new Blob([serializeProgressExport(progress)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = progressExportFilename();
            a.click();
            URL.revokeObjectURL(url);
          }}
          onImportProgress={(fileText) => {
            const result = parseProgressImport(fileText);
            if (!result.ok) return result;
            saveProgress(result.progress);
            setProgress(result.progress);
            return { ok: true };
          }}
        />
      )}
    </div>
  );
}
