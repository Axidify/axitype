import { useCallback, useEffect, useMemo, useState } from "react";
import { Arena, type ArenaResult } from "../components/Arena";
import { LevelHub } from "../components/LevelHub";
import { Results } from "../components/Results";
import { Stats } from "../components/Stats";
import { buildDrillPrompt, getDrill } from "../game/drills";
import { getLevel, LEVELS, type DrillKind, type Track } from "../game/levels";
import { generatePrompt } from "../game/prompts";
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
  lockFinger?: FingerId;
  eyesUp?: boolean;
  timedSeconds?: number;
}

export default function App() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [view, setView] = useState<View>("hub");
  const [session, setSession] = useState<Session | null>(null);
  const [lastResult, setLastResult] = useState<ArenaResult | null>(null);
  const [lastStars, setLastStars] = useState(0);
  const [unlockedNext, setUnlockedNext] = useState(false);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const unlockedKeys = useMemo(() => {
    const max = Math.min(progress.unlockedLevel, 12);
    const set = new Set<string>();
    for (const level of LEVELS) {
      if (level.id <= max) {
        for (const ch of level.keys) set.add(ch);
      }
    }
    return [...set].join("") || "asdf";
  }, [progress.unlockedLevel]);

  const patchProgress = useCallback((fn: (p: ProgressState) => ProgressState) => {
    setProgress((p) => fn(p));
  }, []);

  const startLevel = (id: number) => {
    const level = getLevel(id);
    const prompt = generatePrompt({
      keys: level.keys,
      length: level.length,
      stats: progress.keyStats,
      preferAlternating: id >= 6,
    });
    setSession({
      title: level.title,
      prompt,
      levelId: id,
      eyesUp: Boolean(level.eyesUp && progress.track === "retrain"),
      timedSeconds: level.timedSeconds,
    });
    setView("arena");
  };

  const startPractice = () => {
    const prompt = generatePrompt({
      keys: unlockedKeys,
      length: 100,
      stats: progress.keyStats,
      preferAlternating: true,
    });
    setSession({ title: "Practice lane", prompt, levelId: "practice" });
    setView("arena");
  };

  const startDrill = (kind: DrillKind, afterLevel: number) => {
    const level = getLevel(Math.min(afterLevel, progress.unlockedLevel));
    const built = buildDrillPrompt(kind, level.keys, progress.missCounts, progress.keyStats);
    const def = getDrill(kind);
    setSession({
      title: def.title,
      prompt: built.prompt,
      levelId: "drill",
      drill: kind,
      drillAfterLevel: afterLevel,
      lockFinger: built.lockFinger,
      eyesUp: built.eyesUp,
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
      if (stars >= 1 && levelId >= progress.unlockedLevel && levelId < 12) {
        unlocked = true;
      }
    } else if (levelId === "drill" && drill) {
      stars = completed ? 1 : 0;
    }

    setLastStars(stars);
    setUnlockedNext(unlocked);
    setLastResult(result);

    setProgress((p) => {
      const next: ProgressState = {
        ...p,
        keyStats: { ...p.keyStats },
        missCounts: { ...p.missCounts },
        levelStars: { ...p.levelStars },
        bestByLevel: { ...p.bestByLevel },
        formBadges: { ...p.formBadges },
      };

      for (const ev of keyEvents) {
        next.keyStats = updateKeyStat(next.keyStats, ev.key, ev.hit, ev.ms);
        if (!ev.hit) {
          next.missCounts[ev.key] = (next.missCounts[ev.key] ?? 0) + 1;
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
        },
      ].slice(-40);

      return next;
    });

    setView("results");
  };

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
        />
      )}

      {view === "arena" && session && (
        <Arena
          title={session.title}
          prompt={session.prompt}
          progress={progress}
          levelId={session.levelId}
          drill={session.drill}
          lockFinger={session.lockFinger}
          eyesUp={session.eyesUp}
          timedSeconds={session.timedSeconds}
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
          onRetry={() => {
            if (typeof lastResult.levelId === "number") startLevel(lastResult.levelId);
            else if (lastResult.drill && session?.drillAfterLevel)
              startDrill(lastResult.drill, session.drillAfterLevel);
            else startPractice();
          }}
          onNext={() => {
            if (typeof lastResult.levelId === "number" && lastResult.levelId < 12) {
              startLevel(lastResult.levelId + 1);
            } else setView("hub");
          }}
          onHub={() => setView("hub")}
        />
      )}

      {view === "stats" && (
        <Stats
          progress={progress}
          onBack={() => setView("hub")}
          onWeakFinger={() => startDrill("weakFinger", Math.min(9, progress.unlockedLevel))}
        />
      )}
    </div>
  );
}
