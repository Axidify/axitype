import { useState } from "react";
import { DRILLS, getDrill } from "../game/drills";
import { localDateKey, todaysDailyBest } from "../game/daily";
import { FOCUS_UNLOCK_LEVEL, isFocusUnlocked } from "../game/focus";
import { GAUNTLET_UNLOCK_LEVEL, isGauntletUnlocked } from "../game/gauntlet";
import {
  accuracyGate,
  LEVELS,
  type DrillKind,
  type Track,
} from "../game/levels";
import type { ProfileRecord } from "../lib/profiles";
import type { ProgressState } from "../lib/storage";
import { formBadgeKey } from "../lib/storage";
import {
  drillGateFor,
  highlightedBlockingDrill,
  stageLocked,
} from "../game/progression";
import type { PracticeConfig } from "../game/practiceSetup";
import { practiceMissCounts } from "../game/practiceSetup";
import {
  campaignStarSummary,
  hubDailyBestLabel,
  hubGauntletBestLabel,
  retrainBadgeSummary,
} from "../game/milestones";
import { PastePracticeModal } from "./PastePracticeModal";
import { PracticeSetupModal } from "./PracticeSetupModal";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { RetrainIntro } from "./RetrainIntro";
import styles from "./LevelHub.module.css";

interface LevelHubProps {
  progress: ProgressState;
  unlockedKeys: string;
  profiles: ProfileRecord[];
  activeProfileId: string;
  onSwitchProfile: (profileId: string) => void;
  onCreateProfile: (name: string) => { ok: true } | { ok: false; error: string };
  onRenameProfile: (profileId: string, name: string) => { ok: true } | { ok: false; error: string };
  onDeleteProfile: (profileId: string) => { ok: true } | { ok: false; error: string };
  onTrack: (track: Track) => void;
  onPlayLevel: (id: number) => void;
  onStartPractice: (config: PracticeConfig) => void;
  onPastePractice: (rawText: string) => void;
  onDaily: () => void;
  onGauntlet: () => void;
  onFocus: () => void;
  focusPreview?: { label: string; tooltip: string } | null;
  hubCoaching?: { title: string; detail: string } | null;
  onStats: () => void;
  onDrill: (kind: DrillKind, afterLevel: number) => void;
  onToggleFormCoach: () => void;
  onToggleSound: () => void;
  onToggleDemoMode: () => void;
  onDismissTrackExplainer: () => void;
  onDismissRetrainIntro: () => void;
}

function Stars({ n }: { n: number }) {
  const filled = Math.max(0, Math.min(3, n));
  return (
    <span className={styles.stars} aria-label={`${filled} of 3 stars`}>
      <span className={styles.starsFilled}>{"★".repeat(filled)}</span>
      <span className={styles.starsEmpty}>{"☆".repeat(3 - filled)}</span>
    </span>
  );
}

function LockIcon() {
  return (
    <svg
      className={styles.lockIcon}
      width="12"
      height="12"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M4.5 7V5.5a3.5 3.5 0 1 1 7 0V7h.75A1.75 1.75 0 0 1 14 8.75v4.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-4.5A1.75 1.75 0 0 1 3.75 7H4.5Zm1.25 0h4.5V5.5a2.25 2.25 0 1 0-4.5 0V7Z"
      />
    </svg>
  );
}

export function LevelHub({
  progress,
  unlockedKeys,
  profiles,
  activeProfileId,
  onSwitchProfile,
  onCreateProfile,
  onRenameProfile,
  onDeleteProfile,
  onTrack,
  onPlayLevel,
  onStartPractice,
  onPastePractice,
  onDaily,
  onGauntlet,
  onFocus,
  focusPreview = null,
  hubCoaching = null,
  onStats,
  onDrill,
  onToggleFormCoach,
  onToggleSound,
  onToggleDemoMode,
  onDismissTrackExplainer,
  onDismissRetrainIntro,
}: LevelHubProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const demo = progress.coachPrefs.demoMode;
  const continueId = Math.min(progress.unlockedLevel, 12);
  const gauntletOpen = isGauntletUnlocked(progress.unlockedLevel, demo);
  const focusOpen = isFocusUnlocked(progress.unlockedLevel, demo);
  const dateKey = localDateKey();
  const dailyBest = todaysDailyBest(progress.dailyBest, dateKey);
  const gate = accuracyGate(progress.track);
  const milestoneLine =
    retrainBadgeSummary(progress, demo) ?? campaignStarSummary(progress);
  const showExplainer = !progress.coachPrefs.seenTrackExplainer;
  const showRetrainIntro =
    progress.track === "retrain" && !progress.coachPrefs.seenRetrainIntro;

  const highlightedDrill = highlightedBlockingDrill(progress, demo);

  return (
    <>
    <section className={styles.hub}>
      {showRetrainIntro && <RetrainIntro onDone={onDismissRetrainIntro} />}
      <header className={styles.hero}>
        <div className={styles.topBar}>
          <p className={styles.brand}>AxiType</p>
          <div className={styles.topBarRight}>
            <button type="button" className={styles.ghost} onClick={onStats}>
              Stats
            </button>
            <ProfileSwitcher
              className={styles.profileInline}
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSwitch={onSwitchProfile}
              onCreate={onCreateProfile}
              onRename={onRenameProfile}
              onDelete={onDeleteProfile}
            />
          </div>
        </div>

        <div className={styles.playCard}>
          <div className={styles.tracks}>
            <button
              type="button"
              className={progress.track === "learn" ? styles.trackOn : styles.track}
              onClick={() => onTrack("learn")}
            >
              Learn
            </button>
            <button
              type="button"
              className={progress.track === "retrain" ? styles.trackOn : styles.track}
              onClick={() => onTrack("retrain")}
            >
              Retrain
            </button>
          </div>
          <button type="button" className={styles.primary} onClick={() => onPlayLevel(continueId)}>
            Continue · Mission {continueId}
          </button>
          {milestoneLine && <p className={styles.milestones}>{milestoneLine}</p>}
          {highlightedDrill && (
            <p className={styles.requiredDrill}>
              Next: complete <strong>{getDrill(highlightedDrill).title}</strong> drill below
            </p>
          )}
        </div>

        <div className={styles.modesBlock}>
          <p className={styles.modesLabel}>Practice modes</p>
          <div className={styles.modes}>
            <button type="button" className={styles.modeChip} onClick={() => setPracticeOpen(true)}>
              Practice
            </button>
            <button
              type="button"
              className={`${styles.modeChip} ${styles.paste}`}
              onClick={() => setPasteOpen(true)}
              title="Paste your own text"
            >
              Paste
            </button>
            <button
              type="button"
              className={`${styles.modeChip} ${styles.daily}`}
              onClick={onDaily}
              title={
                dailyBest
                  ? `Today's best: ${hubDailyBestLabel(dailyBest)}`
                  : "One shared prompt for today"
              }
            >
              Daily
            </button>
            <button
              type="button"
              className={`${styles.modeChip} ${styles.focus}`}
              disabled={!focusOpen}
              onClick={onFocus}
              title={
                focusOpen
                  ? focusPreview?.tooltip ?? "Accuracy → speed rehab on your weakest zone"
                  : `Unlocks at Mission ${FOCUS_UNLOCK_LEVEL} — accuracy then speed tiers`
              }
            >
              Focus{focusPreview ? ` · ${focusPreview.label}` : ""}
            </button>
            <button
              type="button"
              className={`${styles.modeChip} ${styles.gauntlet}`}
              disabled={!gauntletOpen}
              onClick={onGauntlet}
              title={
                progress.gauntletBest
                  ? `Best: ${hubGauntletBestLabel(progress.gauntletBest)}`
                  : gauntletOpen
                    ? "Each wave needs minimum accuracy to advance — miss the bar and the run ends"
                    : `Unlocks at Mission ${GAUNTLET_UNLOCK_LEVEL}`
              }
            >
              Gauntlet
              {progress.gauntletBest ? ` · ${progress.gauntletBest.wavesCleared}` : ""}
            </button>
          </div>
        </div>

        {hubCoaching && (
          <p className={styles.coachingTip}>
            <strong>{hubCoaching.title}</strong> — {hubCoaching.detail}
          </p>
        )}

        <details className={styles.hubDetails} open={showExplainer}>
          <summary>Rules &amp; settings</summary>
          <div className={styles.hubDetailsBody}>
            {showExplainer ? (
              <div className={styles.explainer}>
                <p>
                  <strong>Learn</strong> — calmer coaching, {accuracyGate("learn")}% accuracy to unlock,
                  Form Coach optional.
                </p>
                <p>
                  <strong>Retrain</strong> — habit-breaking path: home check, pace gates, mandatory drills
                  between stages, {accuracyGate("retrain")}% accuracy gate.
                </p>
                <button type="button" className={styles.explainerDismiss} onClick={onDismissTrackExplainer}>
                  Got it
                </button>
              </div>
            ) : (
              <p className={styles.trackHint}>
                {progress.track === "retrain"
                  ? "Form first. Mandatory drills between stages."
                  : "Calmer arena — Form Coach optional."}
              </p>
            )}
            <p className={styles.legend}>
              ★★ {gate}%+ unlocks the next mission · ★★★ hits WPM target with no peek
              {progress.track === "retrain" ? " · Retrain needs Form drills between stages" : ""}
            </p>
            <div className={styles.prefs}>
              <label>
                <input
                  type="checkbox"
                  checked={progress.coachPrefs.formCoach || progress.track === "retrain"}
                  disabled={progress.track === "retrain"}
                  onChange={onToggleFormCoach}
                />
                Form Coach
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={progress.coachPrefs.sound}
                  onChange={onToggleSound}
                />
                Sound
              </label>
              <label>
                <input type="checkbox" checked={demo} onChange={onToggleDemoMode} />
                Demo mode
              </label>
            </div>
          </div>
        </details>
      </header>

      {demo && (
        <p className={styles.demoBanner}>
          Demo mode — all missions open. Results won&apos;t save.
        </p>
      )}

      <ol className={styles.lane}>
        {LEVELS.map((level) => {
          const progressLocked = !demo && level.id > progress.unlockedLevel;
          const drillLocked = stageLocked(progress, level.id, demo);
          const locked = progressLocked || drillLocked;
          const stars = progress.levelStars[level.id] ?? 0;
          const badge =
            level.unlockDrill &&
            progress.formBadges[formBadgeKey(level.id, level.unlockDrill)];
          const drillGate = drillGateFor(level.id);
          const showDrillHint =
            drillLocked &&
            drillGate &&
            highlightedDrill === drillGate.kind &&
            progress.unlockedLevel >= drillGate.afterLevel;
          const showProgressHint =
            progressLocked &&
            !drillLocked &&
            level.id === progress.unlockedLevel + 1;
          const isCurrent = !locked && level.id === continueId;
          return (
            <li key={level.id}>
              <button
                type="button"
                className={`${styles.node} ${locked ? styles.locked : ""} ${isCurrent ? styles.current : ""}`}
                disabled={locked}
                onClick={() => onPlayLevel(level.id)}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className={styles.num}>{level.id}</span>
                <span className={styles.meta}>
                  <span className={styles.titleRow}>
                    <strong>{level.title}</strong>
                    {locked && <LockIcon />}
                    {isCurrent && <span className={styles.currentBadge}>Current</span>}
                    <Stars n={stars} />
                    {badge && (
                      <span className={styles.badge} title="Form drill cleared">
                        Form ✓
                      </span>
                    )}
                  </span>
                  {showDrillHint && drillGate && (
                    <span className={styles.lockHint}>
                      Complete <strong>{drillGate.title}</strong> drill to unlock
                    </span>
                  )}
                  {showProgressHint && (
                    <span className={styles.lockHint}>
                      Earn ★★ ({gate}%+) on Mission {progress.unlockedLevel} to unlock
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <details className={styles.drillsDetails} open={highlightedDrill != null}>
        <summary>Habit drills</summary>
        <div className={styles.drillGrid}>
          {DRILLS.map((d) => {
            const unlocked = demo || progress.unlockedLevel >= d.afterLevel;
            const earned = progress.formBadges[formBadgeKey(d.afterLevel, d.kind)];
            const needed = highlightedDrill === d.kind;
            return (
              <button
                key={d.kind}
                type="button"
                className={`${styles.drill} ${needed ? styles.drillNeeded : ""}`}
                disabled={!unlocked}
                onClick={() => onDrill(d.kind, d.afterLevel)}
              >
                <strong>
                  {d.title} {earned ? "✓" : ""}
                  {needed && !earned ? " · required" : ""}
                </strong>
                <span>{d.blurb}</span>
              </button>
            );
          })}
        </div>
      </details>
    </section>
    {practiceOpen && (
      <PracticeSetupModal
        unlockedKeys={unlockedKeys}
        keyStats={progress.keyStats}
        missCounts={practiceMissCounts(progress)}
        onClose={() => setPracticeOpen(false)}
        onStart={(config) => {
          setPracticeOpen(false);
          onStartPractice(config);
        }}
      />
    )}
    {pasteOpen && (
      <PastePracticeModal
        unlockedKeys={unlockedKeys}
        onClose={() => setPasteOpen(false)}
        onStart={(rawText) => {
          setPasteOpen(false);
          onPastePractice(rawText);
        }}
      />
    )}
  </>
  );
}
