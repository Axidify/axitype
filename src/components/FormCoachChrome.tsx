import { reachCue, type FingerId, FINGERS } from "../game/fingers";
import styles from "./FormCoachChrome.module.css";

interface FormCoachChromeProps {
  target: string;
  activeFinger?: FingerId;
  missTip: string | null;
}

export function FormCoachChrome({ target, activeFinger, missTip }: FormCoachChromeProps) {
  const finger = activeFinger ?? null;
  const label = finger ? FINGERS[finger].label : "—";
  const home = finger ? (FINGERS[finger].home === " " ? "Space" : FINGERS[finger].home.toUpperCase()) : "—";
  return (
    <div className={styles.chrome}>
      <div className={styles.chip}>
        <span className={styles.finger}>{label}</span>
        <span className={styles.meta}>home {home}</span>
        <span className={styles.cue}>{target ? reachCue(target) : "Waiting…"}</span>
      </div>
      {missTip && <p className={styles.tip}>{missTip}</p>}
    </div>
  );
}
