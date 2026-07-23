import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arena, type ArenaResult } from "../components/Arena";
import { LevelHub } from "../components/LevelHub";
import { Results } from "../components/Results";
import { Stats } from "../components/Stats";
import { buildDrillPrompt, getDrill } from "../game/drills";
import { getLevel, LEVELS, type DrillKind, type Track } from "../game/levels";
import { buildSessionPrompt, promptModeForLevel, promptModeForPractice } from "../game/prompts";
import { calcStars } from "../game/scoring";
import type { FingerId } from "../game/fingers";
import {
  formBadgeKey,
  loadProgress,
  saveProgress,
  updateKeyStat,
  type ProgressState,
} from "../lib/storage";
import styles from "./App.module.css";

type View = "hub" | "arena" | "results" | "stats";

interface Session {
  title: string;
  prompt: string;
  levelId: number | "practice" | "drill";
  drill?: DrillKind;
  drillAfterLevel?: number;
  /** Mission to resume after a rehab drill launched from Results. */
  returnToLevelId?: number;
  lockFinger?: FingerId;
  eyesUp?: boolean;
  timedSeconds?: number;
  /** Bumps every start/retry so Arena remounts with a fresh run. */
  runId: number;
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
    setView("arena");
  };

  const startDrill = (
    kind: DrillKind,
    afterLevel: number,
    missCountsOverride?: Record<string, number>,
    returnToLevelId?: number,
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
    setView("arena");
  };

  const applyResult = (result: ArenaResult) => {
    const { snapshot, levelId, drill, keyEvents } = result;
    const completed = snapshot.finished && !snapshot.timedOut;

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
        next.levelStars[levelId] = Math.max(next.levelStars[levelId] ?? 0, stars);
        const best = next.bestByLevel[levelId];
        if (!best || snapshot.score > best.score) {
          next.bestByLevel[levelId] = {
            score: snapshot.score,
            wpm: snapshot.wpm,
            accuracy: snapshot.accuracy,
          };
        }
        if (unlocked) next.unlockedLevel = levelId + 1;
        if (level.id >= 5) {
          next.coachPrefs = { ...next.coachPrefs, skipHomeAfter5: true };
        }
      } else if (levelId === "drill" && drill) {
        const after = session?.drillAfterLevel ?? 1;
        next.formBadges[formBadgeKey(after, drill)] = true;
      }

      next.roundHistory = [
        ...next.roundHistory,
        {
          at: Date.now(),
          levelId,
          drill,
          wpm: snapshot.wpm,
          accuracy: snapshot.accuracy,
          score: snapshot.score,
          stars,
          missCounts: roundMisses,
        },
      ].slice(-40);

      return next;
    });

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

  return (
    <div className={styles.shell}>
      {view === "hub" && (
        <LevelHub
          progress={progress}
          onTrack={(track: Track) =>
            patchProgress((p) => ({
              ...p,
              track,
              coachPrefs: {
                ...p.coachPrefs,
                formCoach: track === "retrain" ? true : p.coachPrefs.formCoach,
              },
            }))
          }
          onPlayLevel={startLevel}
          onPractice={startPractice}
          onStats={() => setView("stats")}
          onDrill={startDrill}
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
          demoMode={progress.coachPrefs.demoMode}
          onFinished={applyResult}
          onExit={() => setView("hub")}
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
            if (typeof lastResult.levelId === "number") startLevel(lastResult.levelId);
            else if (lastResult.drill && session?.drillAfterLevel)
              startDrill(
                lastResult.drill,
                session.drillAfterLevel,
                undefined,
                session.returnToLevelId,
              );
            else startPractice(session?.timedSeconds);
          }}
          onNext={startLevel}
          onHub={() => setView("hub")}
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
            )
          }
        />
      )}

      {view === "stats" && (
        <Stats
          progress={progress}
          onBack={() => setView("hub")}
          onWeakFinger={(missCounts) =>
            startDrill("weakFinger", Math.min(9, progress.unlockedLevel), missCounts)
          }
        />
      )}
    </div>
  );
}
