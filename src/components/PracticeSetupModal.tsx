import { useMemo, useState } from "react";
import type { FingerId } from "../game/fingers";
import {
  DEFAULT_PRACTICE_CONFIG,
  PRACTICE_DURATION_OPTIONS,
  PRACTICE_FINGER_OPTIONS,
  PRACTICE_FOCUS_OPTIONS,
  buildPracticeSession,
  weakFingerPracticeTarget,
  type PracticeConfig,
} from "../game/practiceSetup";
import type { KeyStatMap } from "../lib/storage";
import styles from "./PracticeSetupModal.module.css";

interface PracticeSetupModalProps {
  unlockedKeys: string;
  keyStats: KeyStatMap;
  missCounts: Record<string, number>;
  onClose: () => void;
  onStart: (config: PracticeConfig) => void;
}

export function PracticeSetupModal({
  unlockedKeys,
  keyStats,
  missCounts,
  onClose,
  onStart,
}: PracticeSetupModalProps) {
  const [config, setConfig] = useState<PracticeConfig>(DEFAULT_PRACTICE_CONFIG);
  const [error, setError] = useState<string | null>(null);

  const weakTarget = useMemo(
    () => weakFingerPracticeTarget(unlockedKeys, missCounts),
    [unlockedKeys, missCounts],
  );
  const preview = useMemo(
    () => buildPracticeSession(config, unlockedKeys, keyStats, missCounts),
    [config, unlockedKeys, keyStats, missCounts],
  );
  const focusHint =
    config.focus === "weak" && weakTarget
      ? `Targets ${weakTarget.label} · ${weakTarget.sampleKeys}`
      : PRACTICE_FOCUS_OPTIONS.find((f) => f.id === config.focus)?.hint ?? "";

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-setup-title"
      onClick={onClose}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <p className={styles.kicker}>Practice</p>
        <h2 id="practice-setup-title">Set up practice</h2>
        <p className={styles.hint}>Pick duration and what to drill — no stars, no unlock gates.</p>

        <fieldset className={styles.fieldset}>
          <legend>Duration</legend>
          <div className={styles.chips}>
            {PRACTICE_DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={config.duration === opt.id ? styles.chipOn : styles.chip}
                onClick={() => setConfig((c) => ({ ...c, duration: opt.id }))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Focus</legend>
          <div className={styles.chips}>
            {PRACTICE_FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={config.focus === opt.id ? styles.chipOn : styles.chip}
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    focus: opt.id,
                    finger: opt.id === "finger" ? c.finger ?? "LI" : undefined,
                  }))
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          {weakTarget && config.focus !== "weak" && (
            <p className={styles.weakSuggest}>
              Weak finger targets {weakTarget.label} · {weakTarget.sampleKeys}
            </p>
          )}
          {focusHint && <p className={styles.focusHint}>{focusHint}</p>}
        </fieldset>

        {config.focus === "finger" && (
          <fieldset className={styles.fieldset}>
            <legend>Finger</legend>
            <div className={styles.chips}>
              {PRACTICE_FINGER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={config.finger === opt.id ? styles.chipOn : styles.chip}
                  onClick={() => setConfig((c) => ({ ...c, finger: opt.id as FingerId }))}
                >
                  {opt.label.replace("Left ", "L·").replace("Right ", "R·")}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {preview.ok ? (
          <p className={styles.preview}>
            Ready — ~{preview.result.prompt.length} chars
            {preview.result.timedSeconds ? ` · ${preview.result.timedSeconds}s timer` : ""}
          </p>
        ) : (
          <p className={styles.error}>{preview.error}</p>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={!preview.ok}
            onClick={() => {
              if (!preview.ok) {
                setError(preview.error);
                return;
              }
              onStart(config);
            }}
          >
            Start typing
          </button>
        </div>
      </div>
    </div>
  );
}
