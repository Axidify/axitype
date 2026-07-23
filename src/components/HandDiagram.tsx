import type { FingerId } from "../game/fingers";
import { FINGERS } from "../game/fingers";
import styles from "./HandDiagram.module.css";

interface HandDiagramProps {
  active?: FingerId;
}

const LEFT: FingerId[] = ["LP", "LR", "LM", "LI"];
const RIGHT: FingerId[] = ["RI", "RM", "RR", "RP"];

export function HandDiagram({ active }: HandDiagramProps) {
  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.hand}>
        {LEFT.map((id) => (
          <span
            key={id}
            className={`${styles.tip} ${active === id ? styles.on : ""}`}
            style={{ background: `var(${FINGERS[id].cssVar})` }}
            title={FINGERS[id].label}
          />
        ))}
        <span
          className={`${styles.thumb} ${active === "LT" || active === "RT" ? styles.on : ""}`}
        />
      </div>
      <div className={`${styles.hand} ${styles.right}`}>
        <span
          className={`${styles.thumb} ${active === "LT" || active === "RT" ? styles.on : ""}`}
        />
        {RIGHT.map((id) => (
          <span
            key={id}
            className={`${styles.tip} ${active === id ? styles.on : ""}`}
            style={{ background: `var(${FINGERS[id].cssVar})` }}
            title={FINGERS[id].label}
          />
        ))}
      </div>
    </div>
  );
}
