import { useState } from "react";
import styles from "./RetrainIntro.module.css";

const STEPS = [
  {
    title: "Break bad habits",
    body: (
      <>
        Retrain targets habits that slow you down: <strong>peeking</strong> at the keyboard,{" "}
        <strong>wrong-finger reaches</strong>, and <strong>same-hand pecking</strong> (two keys
        with one hand when the other is free).
      </>
    ),
  },
  {
    title: "Home check first",
    body: (
      <>
        Every round starts with a home-row check. Rest on <strong>A S D F</strong> and{" "}
        <strong>J K L ;</strong>, thumbs on space, then press <strong>Space</strong> to begin.
        Placement before speed.
      </>
    ),
  },
  {
    title: "Pace gate",
    body: (
      <>
        If accuracy drops during a run, Retrain <strong>slows you down</strong> and asks you to
        reset to home. Clean rhythm beats panic typing — the gate lifts after a short correct
        streak.
      </>
    ),
  },
  {
    title: "Form drills between stages",
    body: (
      <>
        Some missions stay locked until you earn a <strong>Form badge</strong> from the matching
        habit drill. Complete the highlighted drill in the hub, then return to the mission lane.
      </>
    ),
  },
] as const;

interface RetrainIntroProps {
  onDone: () => void;
}

export function RetrainIntro({ onDone }: RetrainIntroProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="retrain-intro-title">
      <div className={styles.card}>
        <p className={styles.kicker}>
          Retrain · {step + 1} / {STEPS.length}
        </p>
        <h2 id="retrain-intro-title">{current.title}</h2>
        <p className={styles.body}>{current.body}</p>
        <div className={styles.dots} aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? styles.dotOn : styles.dot} />
          ))}
        </div>
        <div className={styles.actions}>
          {step > 0 && (
            <button type="button" className={styles.secondary} onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          <button
            type="button"
            className={styles.primary}
            onClick={() => (last ? onDone() : setStep((s) => s + 1))}
          >
            {last ? "Start Retrain" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
