import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arena, type ArenaResult } from "../components/Arena";
import { FocusGate, type FocusGateKind } from "../components/FocusGate";
import { LevelHub } from "../components/LevelHub";
import { Results } from "../components/Results";
import { Stats } from "../components/Stats";
import { buildDrillPrompt, getDrill } from "../game/drills";
import { buildDrillMilestone, buildMissionMilestone, type DrillMilestone, type MissionMilestone } from "../game/milestones";
import {
  buildGauntletPrompt,
  gauntletAccuracyForWave,
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
  focusFailureHint,
  focusHubPreview,
  focusRoundPassed,
  focusRoundTitle,
  focusSpeedTarget,
  FOCUS_MAX_SPEED_TIER,
  isFocusUnlocked,
  type FocusRunState,
} from "../game/focus";
import {
  buildDailyPrompt,
  formatDailyLabel,
  isBetterDailyRun,
  localDateKey,
  todaysDailyBest,
  type DailyBest,
} from "../game/daily";
import { pastePracticeTitle, preparePastePrompt } from "../game/pastePractice";
import { accuracyGate, getLevel, LEVELS, type DrillKind, type Track } from "../game/levels";
import { buildPracticeSession, DEFAULT_PRACTICE_CONFIG, practiceMissCounts, type PracticeConfig } from "../game/practiceSetup";
import { buildSessionPrompt, promptModeForLevel } from "../game/prompts";
import { calcStars } from "../game/scoring";
import type { FingerId } from "../game/fingers";
import {
  aggregateMissCounts,
  formBadgeKey,
  updateKeyStat,
  type ProgressState,
} from "../lib/storage";
import {
  appendAnalyticsEvent,
  type AnalyticsEventInput,
  type DrillStartSource,
} from "../lib/analytics";
import {
  focusSpeedCoaching,
  hubCoachingTip,
  missionGateCoaching,
  summarizeAnalytics,
} from "../lib/analyticsInsights";
import {
  parseBackupImport,
  profileExportFilename,
  serializeProfileExport,
} from "../lib/progressBackup";
import {
  addProfile,
  deleteProfile,
  getActiveAnalytics,
  getActiveProgress,
  getActiveProfile,
  loadProfileStoreFromLocalStorage,
  renameProfile,
  saveProfileStoreToLocalStorage,
  setActiveAnalytics,
  setActiveProgress,
  switchActiveProfile,
  type ProfileStore,
} from "../lib/profiles";
import styles from "./App.module.css";

type View = "hub" | "arena" | "results" | "stats" | "focusGate";

interface Session {
  title: string;
  prompt: string;
  levelId: number | "practice" | "paste" | "drill" | "gauntlet" | "focus" | "daily";
  drill?: DrillKind;
  drillAfterLevel?: number;
  /** Mission to resume after a rehab drill launched from Results. */
  returnToLevelId?: number;
  lockFinger?: FingerId;
  eyesUp?: boolean;
  timedSeconds?: number;
  gauntletRun?: GauntletRunState;
  focusRun?: FocusRunState;
  /** Original paste input for restart. */
  pasteSource?: string;
  /** Practice mode config for restart. */
  practiceConfig?: PracticeConfig;
  /** Bumps every start/retry so Arena remounts with a fresh run. */
  runId: number;
}

interface DailySummary {
  date: string;
  wpm: number;
  accuracy: number;
  score: number;
  completed: boolean;
  isNewBest: boolean;
  previousBest: DailyBest | null;
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
  totalAttempts: number;
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
  const [profileStore, setProfileStore] = useState<ProfileStore>(() =>
    loadProfileStoreFromLocalStorage(),
  );
  const progress = getActiveProgress(profileStore);
  const activeProfile = getActiveProfile(profileStore);
  const [view, setView] = useState<View>("hub");
  const [session, setSession] = useState<Session | null>(null);
  const [lastResult, setLastResult] = useState<ArenaResult | null>(null);
  const [lastStars, setLastStars] = useState(0);
  const [unlockedNext, setUnlockedNext] = useState(false);
  const [gauntletSummary, setGauntletSummary] = useState<GauntletSummary | null>(null);
  const [focusSummary, setFocusSummary] = useState<FocusSummary | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [missionSummary, setMissionSummary] = useState<MissionMilestone | null>(null);
  const [drillSummary, setDrillSummary] = useState<DrillMilestone | null>(null);
  const [focusGate, setFocusGate] = useState<FocusGateState | null>(null);
  const runIdRef = useRef(0);
  const lastPromptRef = useRef<string | null>(null);

  useEffect(() => {
    saveProfileStoreToLocalStorage(profileStore);
  }, [profileStore]);

  const setProgress = useCallback(
    (updater: ProgressState | ((p: ProgressState) => ProgressState)) => {
      setProfileStore((store) => {
        const current = getActiveProgress(store);
        const next = typeof updater === "function" ? updater(current) : updater;
        return setActiveProgress(store, next);
      });
    },
    [],
  );

  const trackEvent = useCallback((input: AnalyticsEventInput) => {
    setProfileStore((store) =>
      setActiveAnalytics(store, appendAnalyticsEvent(getActiveAnalytics(store), input)),
    );
  }, []);

  const resetToHubForProfileChange = () => {
    setSession(null);
    setLastResult(null);
    setGauntletSummary(null);
    setFocusSummary(null);
    setDailySummary(null);
    setMissionSummary(null);
    setDrillSummary(null);
    setFocusGate(null);
    setView("hub");
  };

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
  }, [setProgress]);

  const analyticsBase = () => ({
    track: progress.track,
    demoMode: progress.coachPrefs.demoMode,
  });

  const playInsights = () => summarizeAnalytics(getActiveAnalytics(profileStore));

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
    trackEvent({ type: "roundStarted", levelId: id, ...analyticsBase() });
    setView("arena");
  };

  const startConfiguredPractice = (config: PracticeConfig) => {
    const misses = practiceMissCounts(progress);
    const lengthScale = playInsights().practiceLengthScale;
    const built = buildPracticeSession(
      config,
      unlockedKeys,
      progress.keyStats,
      misses,
      lengthScale,
    );
    if (!built.ok) return;
    const { result } = built;
    const prompt = freshPrompt(() => {
      const next = buildPracticeSession(
        config,
        unlockedKeys,
        progress.keyStats,
        misses,
        lengthScale,
      );
      return next.ok ? next.result.prompt : result.prompt;
    }, lastPromptRef.current);
    lastPromptRef.current = prompt;
    setSession({
      title: result.title,
      prompt,
      levelId: "practice",
      timedSeconds: result.timedSeconds,
      lockFinger: result.lockFinger,
      practiceConfig: config,
      runId: nextRunId(),
    });
    trackEvent({ type: "roundStarted", levelId: "practice", ...analyticsBase() });
    setView("arena");
  };

  const startPastePractice = (rawText: string) => {
    const prepared = preparePastePrompt(rawText, unlockedKeys);
    if (!prepared.ok) return;
    const prompt = prepared.prompt;
    lastPromptRef.current = prompt;
    setSession({
      title: pastePracticeTitle(prompt),
      prompt,
      levelId: "paste",
      pasteSource: rawText,
      runId: nextRunId(),
    });
    trackEvent({ type: "roundStarted", levelId: "paste", ...analyticsBase() });
    setView("arena");
  };

  const startDaily = () => {
    const dateKey = localDateKey();
    const length = playInsights().dailyPromptLength;
    const prompt = buildDailyPrompt(unlockedKeys, progress.keyStats, dateKey, length);
    lastPromptRef.current = prompt;
    setDailySummary(null);
    setMissionSummary(null);
    setDrillSummary(null);
    setGauntletSummary(null);
    setFocusSummary(null);
    setSession({
      title: `Daily · ${formatDailyLabel(dateKey)}`,
      prompt,
      levelId: "daily",
      runId: nextRunId(),
    });
    trackEvent({ type: "dailyPlayed", date: dateKey, ...analyticsBase() });
    trackEvent({ type: "roundStarted", levelId: "daily", ...analyticsBase() });
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
    trackEvent({ type: "roundStarted", levelId: "gauntlet", ...analyticsBase() });
    setView("arena");
  };

  const startGauntlet = () => {
    startGauntletWave(1, 0);
  };

  const startFocusRound = (run: FocusRunState) => {
    const missCounts = aggregateMissCounts(progress, "recent12");
    const accuracyLength = playInsights().focusAccuracyLength;
    const prompt = freshPrompt(
      () =>
        buildFocusPrompt(
          run.plan,
          run.phase,
          unlockedKeys,
          missCounts,
          progress.keyStats,
          run.speedTier,
          accuracyLength,
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
    trackEvent({ type: "roundStarted", levelId: "focus", ...analyticsBase() });
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
      attempts: 1,
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
      totalAttempts: run.attempts,
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
        attempts: run.attempts + 1,
        retryHint: undefined,
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
      attempts: run.attempts + 1,
      retryHint: undefined,
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
        attempts: run.attempts + 1,
        retryHint: undefined,
      });
      return;
    }

    startFocusRound({
      ...run,
      phase: "speed",
      round: 1,
      attempts: run.attempts + 1,
      retryHint: undefined,
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
      } else if (levelId === "daily") {
        const dateKey = localDateKey();
        const completedRound = snapshot.finished && !snapshot.timedOut;
        const prev = todaysDailyBest(p.dailyBest, dateKey);
        const attempts = (prev?.attempts ?? 0) + 1;
        if (completedRound && isBetterDailyRun(snapshot, prev)) {
          next.dailyBest = {
            date: dateKey,
            wpm: snapshot.wpm,
            accuracy: snapshot.accuracy,
            score: snapshot.score,
            at: Date.now(),
            attempts,
          };
        } else if (prev) {
          next.dailyBest = { ...prev, attempts };
        }
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
    trackEvent({ type: "drillStarted", kind, source, ...analyticsBase() });
    trackEvent({ type: "roundStarted", levelId: "drill", drill: kind, ...analyticsBase() });
    setView("arena");
  };

  const exitArena = () => {
    if (session) {
      trackEvent({
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
    trackEvent({
      type: "roundRestarted",
      levelId: session.levelId,
      drill: session.drill,
      ...analyticsBase(),
    });

    if (session.levelId === "gauntlet") {
      startGauntlet();
      return;
    }
    if (session.levelId === "focus" && session.focusRun) {
      startFocusRound({
        ...session.focusRun,
        attempts: session.focusRun.attempts + 1,
        retryHint: undefined,
      });
      return;
    }
    if (session.levelId === "daily") {
      startDaily();
      return;
    }
    if (session.levelId === "practice" && session.practiceConfig) {
      startConfiguredPractice(session.practiceConfig);
      return;
    }
    if (session.levelId === "paste" && session.pasteSource) {
      startPastePractice(session.pasteSource);
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
      session.levelId === "daily" ||
      session.levelId === "paste" ||
      session.levelId === "practice");

  const applyResult = (result: ArenaResult) => {
    const { snapshot, levelId, drill, keyEvents } = result;
    const completed = snapshot.finished && !snapshot.timedOut;

    trackEvent({
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
      setMissionSummary(null);
      setDrillSummary(null);
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

      const hint = focusFailureHint(
        completed,
        snapshot.wpm,
        keyEvents,
        run.plan,
        run.phase,
        run.targetWpm,
      );
      startFocusRound({
        ...run,
        round: run.round + 1,
        attempts: run.attempts + 1,
        retryHint: hint || undefined,
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

    if (typeof levelId === "number") {
      const priorStars = progress.levelStars[levelId] ?? 0;
      const priorBest = progress.bestByLevel[levelId];
      setMissionSummary(
        buildMissionMilestone({
          priorStars,
          newStars: stars,
          priorBestScore: priorBest?.score ?? null,
          runScore: snapshot.score,
          completed,
        }),
      );
      setDrillSummary(null);
    } else if (levelId === "drill" && drill) {
      const after = session?.drillAfterLevel ?? 1;
      const wasEarned = Boolean(progress.formBadges[formBadgeKey(after, drill)]);
      setDrillSummary(buildDrillMilestone(drill, after, wasEarned, completed));
      setMissionSummary(null);
    } else {
      setMissionSummary(null);
      setDrillSummary(null);
    }

    if (levelId === "daily") {
      const dateKey = localDateKey();
      const prev = todaysDailyBest(progress.dailyBest, dateKey);
      setDailySummary({
        date: dateKey,
        wpm: snapshot.wpm,
        accuracy: snapshot.accuracy,
        score: snapshot.score,
        completed,
        isNewBest: completed && isBetterDailyRun(snapshot, prev),
        previousBest: prev,
      });
    } else {
      setDailySummary(null);
    }

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
          profiles={profileStore.profiles}
          activeProfileId={profileStore.activeProfileId}
          onSwitchProfile={(profileId) => {
            const result = switchActiveProfile(profileStore, profileId);
            if (!result.ok) return;
            setProfileStore(result.store);
            resetToHubForProfileChange();
          }}
          onCreateProfile={(name) => {
            const result = addProfile(profileStore, name);
            if (!result.ok) return result;
            setProfileStore(result.store);
            resetToHubForProfileChange();
            return { ok: true };
          }}
          onRenameProfile={(profileId, name) => {
            const result = renameProfile(profileStore, profileId, name);
            if (!result.ok) return result;
            setProfileStore(result.store);
            return { ok: true };
          }}
          onDeleteProfile={(profileId) => {
            const result = deleteProfile(profileStore, profileId);
            if (!result.ok) return result;
            setProfileStore(result.store);
            resetToHubForProfileChange();
            return { ok: true };
          }}
          onTrack={(track: Track) => {
            if (track !== progress.track) {
              trackEvent({
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
          onStartPractice={startConfiguredPractice}
          unlockedKeys={unlockedKeys}
          onPastePractice={startPastePractice}
          onDaily={startDaily}
          onGauntlet={startGauntlet}
          onFocus={startFocus}
          focusPreview={focusPreview}
          hubCoaching={(() => {
            if (progress.coachPrefs.demoMode) return null;
            const tip = hubCoachingTip(playInsights());
            return tip ? { title: tip.title, detail: tip.detail } : null;
          })()}
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
          gauntletAccuracyGate={
            session.levelId === "gauntlet" && session.gauntletRun
              ? gauntletAccuracyForWave(session.gauntletRun.wave, progress.track)
              : undefined
          }
          focusGoal={session.focusRun ? focusCoachGoal(session.focusRun) : undefined}
          focusReason={session.focusRun?.plan.reason}
          focusRetryHint={session.focusRun?.retryHint}
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
          coachingNote={
            progress.coachPrefs.demoMode || focusGate.gate !== "accuracyToSpeed"
              ? null
              : focusSpeedCoaching(playInsights())
          }
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
            else if (lastResult.levelId === "daily") startDaily();
            else if (lastResult.levelId === "paste" && session?.pasteSource) startPastePractice(session.pasteSource);
            else if (lastResult.levelId === "practice" && session?.practiceConfig)
              startConfiguredPractice(session.practiceConfig);
            else if (typeof lastResult.levelId === "number") startLevel(lastResult.levelId);
            else if (lastResult.drill && session?.drillAfterLevel)
              startDrill(
                lastResult.drill,
                session.drillAfterLevel,
                undefined,
                session.returnToLevelId,
                "results",
              );
            else startConfiguredPractice(session?.practiceConfig ?? DEFAULT_PRACTICE_CONFIG);
          }}
          onNext={startLevel}
          onHub={() => setView("hub")}
          gauntletSummary={gauntletSummary}
          gauntletBest={progress.gauntletBest}
          focusSummary={focusSummary}
          dailySummary={dailySummary}
          missionSummary={missionSummary}
          drillSummary={drillSummary}
          insightsCoaching={(() => {
            if (progress.coachPrefs.demoMode || typeof lastResult.levelId !== "number") return null;
            return missionGateCoaching(
              playInsights(),
              lastResult.snapshot.accuracy < accuracyGate(progress.track),
            );
          })()}
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
            const blob = new Blob([serializeProfileExport(activeProfile)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = profileExportFilename(activeProfile.name);
            a.click();
            URL.revokeObjectURL(url);
          }}
          onImportProgress={(fileText) => {
            const result = parseBackupImport(fileText);
            if (!result.ok) return result;
            if (result.mode === "store") {
              setProfileStore(result.store);
              resetToHubForProfileChange();
              return { ok: true };
            }
            if (result.mode === "profile") {
              setProfileStore((store) => ({
                ...store,
                profiles: store.profiles.map((p) =>
                  p.id === store.activeProfileId
                    ? {
                        ...p,
                        name: result.name,
                        progress: result.progress,
                        analytics: result.analytics,
                        updatedAt: Date.now(),
                      }
                    : p,
                ),
              }));
              return { ok: true };
            }
            setProgress(result.progress);
            return { ok: true };
          }}
        />
      )}
    </div>
  );
}
