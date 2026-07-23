import { FINGERS, fingerForKey, HOME_ROW, type FingerId } from "../game/fingers";
import styles from "./Keyboard.module.css";

const ROWS = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

function matchesTarget(key: string, target: string): boolean {
  if (!target) return false;
  if (target === " ") return false;
  return target === key || target.toLowerCase() === key;
}

interface KeyboardProps {
  target: string;
  activeFinger?: FingerId;
  dimInactive?: boolean;
  hidden?: boolean;
  flashKey?: string | null;
}

export function Keyboard({
  target,
  activeFinger,
  dimInactive,
  hidden,
  flashKey,
}: KeyboardProps) {
  if (hidden) {
    return <div className={styles.hiddenNote}>Keyboard hidden — Eyes Up. Trust the bumps.</div>;
  }

  const targetFinger = target ? fingerForKey(target).id : undefined;
  const finger = activeFinger ?? targetFinger;
  const homeOfFinger = finger ? FINGERS[finger].home : null;

  return (
    <div className={`${styles.board} ${dimInactive ? styles.dim : ""}`}>
      {ROWS.map((row, ri) => (
        <div key={ri} className={styles.row} style={{ marginLeft: `${ri * 0.55}rem` }}>
          {row.map((key) => {
            const info = fingerForKey(key);
            const isTarget = matchesTarget(key, target);
            const isHome = (HOME_ROW as readonly string[]).includes(key);
            const isReachHome = Boolean(homeOfFinger && homeOfFinger === key && !isTarget);
            const isActiveZone = finger === info.id;
            const isFlash = flashKey?.toLowerCase() === key;
            return (
              <span
                key={key}
                className={[
                  styles.key,
                  isHome ? styles.home : "",
                  isTarget ? styles.target : "",
                  isActiveZone ? styles.zone : "",
                  isReachHome ? styles.reach : "",
                  isFlash ? styles.flash : "",
                  key === "f" || key === "j" ? styles.bump : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ ["--zone" as string]: `var(${info.cssVar})` }}
              >
                {key}
              </span>
            );
          })}
        </div>
      ))}
      <div className={styles.row} style={{ justifyContent: "center" }}>
        <span
          className={[
            styles.key,
            styles.space,
            target === " " ? styles.target : "",
            finger === "RT" || finger === "LT" ? styles.zone : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ ["--zone" as string]: "var(--finger-thumb)" }}
        >
          space
        </span>
      </div>
    </div>
  );
}
