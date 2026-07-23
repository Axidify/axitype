import { useMemo, useState } from "react";
import {
  analyzePasteText,
  PASTE_MAX_LENGTH,
  PASTE_MIN_LENGTH,
} from "../game/pastePractice";
import styles from "./PastePracticeModal.module.css";

interface PastePracticeModalProps {
  unlockedKeys: string;
  onClose: () => void;
  onStart: (rawText: string) => void;
}

function formatUnknown(chars: string[]): string {
  return chars
    .map((ch) => {
      if (ch === " ") return "space";
      if (ch === "\n") return "newline";
      return ch;
    })
    .join(", ");
}

export function PastePracticeModal({ unlockedKeys, onClose, onStart }: PastePracticeModalProps) {
  const [raw, setRaw] = useState("");

  const analysis = useMemo(() => analyzePasteText(raw, unlockedKeys), [raw, unlockedKeys]);

  const canStart = raw.trim().length > 0 && !analysis.tooShort;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paste-practice-title"
      onClick={onClose}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <p className={styles.kicker}>Practice</p>
        <h2 id="paste-practice-title">Paste your own text</h2>
        <p className={styles.hint}>
          Type anything you care about — notes, lyrics, code snippets. Unsupported keys are stripped
          to your unlocked charset.
        </p>

        <textarea
          className={styles.input}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste or type here…"
          rows={8}
          autoFocus
        />

        <div className={styles.meta}>
          <span>
            {analysis.prompt.length} chars ready
            {analysis.truncated ? ` (capped at ${PASTE_MAX_LENGTH})` : ""}
          </span>
          <span>Min {PASTE_MIN_LENGTH}</span>
        </div>

        {analysis.unknownChars.length > 0 && (
          <p className={styles.warn}>
            Removing {analysis.removedCount} unsupported{" "}
            {analysis.removedCount === 1 ? "character" : "characters"}:{" "}
            <strong>{formatUnknown(analysis.unknownChars)}</strong>
          </p>
        )}

        {raw.trim().length > 0 && analysis.tooShort && (
          <p className={styles.error}>
            Need at least {PASTE_MIN_LENGTH} unlocked characters — unlock more missions or paste
            longer text.
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={!canStart}
            onClick={() => onStart(raw)}
          >
            Start typing
          </button>
        </div>
      </div>
    </div>
  );
}
