import { useEffect, useMemo, useRef, useState } from "react";
import { suggestDrill, type DrillSuggestion } from "../game/drills";
import type { DrillKind } from "../game/levels";
import { loadAnalytics } from "../lib/analytics";
import { formatFinishRate, summarizeAnalytics } from "../lib/analyticsInsights";
import {
  aggregateMissCounts,
  missCountsToEntries,
  roundsForWindow,
  type MissStatsWindow,
  type ProgressState,
} from "../lib/storage";
import { bestLevelRows, roundShortLabel } from "../lib/statsSummary";
import { MissedKeysHeatmap } from "./charts/MissedKeysHeatmap";
import { ProgressTrendChart } from "./charts/ProgressTrendChart";
import styles from "./Stats.module.css";

interface StatsProps {
  progress: ProgressState;
  onBack: () => void;
  onSuggestedDrill: (kind: DrillKind, afterLevel: number, missCounts: Record<string, number>) => void;
  onExportProgress: () => void;
  onImportProgress: (fileText: string) => { ok: true } | { ok: false; error: string };
}

const WINDOW_OPTIONS: { id: MissStatsWindow; label: string }[] = [
  { id: "recent12", label: "Last 12 rounds" },
  { id: "week", label: "Last 7 days" },
  { id: "all", label: "All time" },
];

export function Stats({
  progress,
  onBack,
  onSuggestedDrill,
  onExportProgress,
  onImportProgress,
}: StatsProps) {
  const [statsWindow, setStatsWindow] = useState<MissStatsWindow>("recent12");
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rounds = roundsForWindow(progress.roundHistory, statsWindow);
  const wpm = rounds.map((r) => r.wpm);
  const accuracy = rounds.map((r) => r.accuracy);
  const labels = rounds.map((r, i) => `${roundShortLabel(r)}·${i + 1}`);

  const missCounts = aggregateMissCounts(progress, statsWindow);
  const misses = missCountsToEntries(missCounts);

  const suggestion: DrillSuggestion | null = useMemo(
    () =>
      suggestDrill(
        missCounts,
        [],
        progress.unlockedLevel,
        progress.coachPrefs.demoMode,
      ),
    [missCounts, progress.unlockedLevel, progress.coachPrefs.demoMode],
  );

  const levelRows = useMemo(
    () => bestLevelRows(progress.bestByLevel, progress.levelStars, progress.unlockedLevel),
    [progress.bestByLevel, progress.levelStars, progress.unlockedLevel],
  );

  const insights = summarizeAnalytics(loadAnalytics());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <section className={styles.wrap}>
      <header className={styles.top}>
        <button type="button" onClick={onBack}>
          Back
        </button>
        <h1>Stats</h1>
      </header>

      <p className={styles.note}>
        Weak zones are inferred from keys you miss — not which finger we saw.
      </p>

      <div className={styles.windowPicker} role="group" aria-label="Stats time range">
        {WINDOW_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={statsWindow === opt.id ? styles.windowActive : styles.windowBtn}
            onClick={() => setStatsWindow(opt.id)}
            aria-pressed={statsWindow === opt.id}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {suggestion && (
        <div className={styles.ctaBox}>
          <div className={styles.ctaCopy}>
            <p className={styles.ctaTitle}>Suggested: {suggestion.title}</p>
            <p className={styles.ctaReason}>{suggestion.reason}</p>
          </div>
          <button
            type="button"
            className={styles.cta}
            onClick={() => onSuggestedDrill(suggestion.kind, suggestion.afterLevel, missCounts)}
          >
            Start {suggestion.title}
          </button>
        </div>
      )}

      <h2>Trends</h2>
      {rounds.length === 0 ? (
        <p className={styles.empty}>
          No rounds in this window yet — finish a mission or practice to see trends.
        </p>
      ) : (
        <ProgressTrendChart wpm={wpm} accuracy={accuracy} labels={labels} />
      )}

      <h2>Best by mission</h2>
      {levelRows.every((row) => row.wpm == null && row.stars === 0) ? (
        <p className={styles.empty}>Clear a mission to lock in a personal best.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.bestTable}>
            <thead>
              <tr>
                <th scope="col">Mission</th>
                <th scope="col">Stars</th>
                <th scope="col">Best WPM</th>
                <th scope="col">Accuracy</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {levelRows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    <span className={styles.missionId}>{row.id}</span>
                    {row.title}
                  </th>
                  <td className={styles.stars}>
                    {"★".repeat(row.stars)}
                    {"☆".repeat(Math.max(0, 3 - row.stars))}
                  </td>
                  <td>{row.wpm == null ? "—" : row.wpm}</td>
                  <td>{row.accuracy == null ? "—" : `${row.accuracy}%`}</td>
                  <td>{row.score == null ? "—" : row.score.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Most missed keys</h2>
      {misses.length === 0 ? (
        <p className={styles.empty}>
          No misses recorded here — keep typing, or widen the time window.
        </p>
      ) : (
        <MissedKeysHeatmap entries={misses} />
      )}

      <h2>Insights</h2>
      <div className={styles.insights}>
        <p className={styles.backupNote}>
          From local play events on this device — used to ease Focus/Daily length when restarts pile
          up. Demo rounds are ignored.
        </p>
        <div className={styles.insightStats}>
          <div>
            <span className={styles.insightLabel}>Finish rate</span>
            <strong>{formatFinishRate(insights.finishRate)}</strong>
          </div>
          <div>
            <span className={styles.insightLabel}>Restarts</span>
            <strong>{insights.restarted}</strong>
          </div>
          <div>
            <span className={styles.insightLabel}>Daily days</span>
            <strong>{insights.uniqueDailyDays}</strong>
          </div>
          <div>
            <span className={styles.insightLabel}>Top drill source</span>
            <strong>{insights.topDrillSource ?? "—"}</strong>
          </div>
        </div>
        <ul className={styles.tipList}>
          {insights.tips.map((tip) => (
            <li
              key={tip.id}
              className={tip.severity === "warn" ? styles.tipWarn : styles.tipInfo}
            >
              <strong>{tip.title}</strong>
              <span>{tip.detail}</span>
            </li>
          ))}
        </ul>
        {(insights.focusAccuracyLength < 42 ||
          insights.dailyPromptLength < 110 ||
          insights.practiceLengthScale < 1) && (
          <p className={styles.tuningNote}>
            Active tuning:
            {insights.focusAccuracyLength < 42
              ? ` Focus accuracy prompts → ${insights.focusAccuracyLength} chars.`
              : ""}
            {insights.dailyPromptLength < 110
              ? ` Daily prompts → ${insights.dailyPromptLength} chars.`
              : ""}
            {insights.practiceLengthScale < 1
              ? ` Practice length → ${Math.round(insights.practiceLengthScale * 100)}%.`
              : ""}
          </p>
        )}
      </div>

      <h2>Backup</h2>
      <div className={styles.backup}>
        <p className={styles.backupNote}>
          Download this profile (progress + insights data) as JSON, or restore a backup. Import
          replaces the <strong>active profile</strong> on this browser (or the whole device store if
          the file is a multi-profile backup).
        </p>
        <div className={styles.backupActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              onExportProgress();
              setBackupError(null);
              setBackupStatus("Progress downloaded.");
            }}
          >
            Export progress
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            Import progress
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className={styles.fileInput}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const text = await file.text();
                const result = onImportProgress(text);
                if (!result.ok) {
                  setBackupStatus(null);
                  setBackupError(result.error);
                  return;
                }
                setBackupError(null);
                setBackupStatus("Progress restored from backup.");
              } catch {
                setBackupStatus(null);
                setBackupError("Couldn't read that file.");
              }
            }}
          />
        </div>
        {backupStatus && <p className={styles.backupOk}>{backupStatus}</p>}
        {backupError && <p className={styles.backupErr}>{backupError}</p>}
      </div>
    </section>
  );
}
