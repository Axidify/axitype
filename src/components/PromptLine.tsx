import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  displayChar,
  measurePromptCharPositions,
  type CharPosition,
} from "./promptLayout";
import styles from "./Arena.module.css";

interface PromptLineProps {
  prompt: string;
  index: number;
  lastMiss: boolean;
}

export function PromptLine({ prompt, index, lastMiss }: PromptLineProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLParagraphElement>(null);
  const [positions, setPositions] = useState<CharPosition[]>([]);

  const chars = useMemo(() => [...prompt], [prompt]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const layout = layoutRef.current;
    if (!wrap || !layout || prompt.length === 0) {
      setPositions([]);
      return;
    }

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const next = measurePromptCharPositions(layout, prompt.length);
      setPositions((prev) => (positionsEqual(prev, next) ? prev : next));
    };

    const scheduleMeasure = () => {
      void document.fonts.ready.then(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(wrap);

    const fonts = document.fonts;
    fonts.addEventListener("loadingdone", scheduleMeasure);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      fonts.removeEventListener("loadingdone", scheduleMeasure);
    };
  }, [prompt]);

  const positioned = positions.length === chars.length;

  return (
    <div className={styles.lineWrap} ref={wrapRef} aria-label={prompt}>
      <p
        ref={layoutRef}
        className={positioned ? styles.lineLayout : styles.lineFallback}
        aria-hidden={positioned}
      >
        {prompt}
      </p>
      {positioned ? (
        <p className={styles.linePaint} aria-hidden="true">
          {chars.map((ch, i) => {
            const pos = positions[i];
            let className = styles.todo;
            if (i < index) className = styles.done;
            else if (i === index) {
              className = `${styles.caret} ${lastMiss ? styles.miss : ""}`;
            }

            return (
              <span
                key={i}
                className={`${styles.char} ${className}`}
                style={{ left: pos.left, top: pos.top }}
              >
                {displayChar(ch)}
              </span>
            );
          })}
        </p>
      ) : null}
    </div>
  );
}

function positionsEqual(a: CharPosition[], b: CharPosition[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].left !== b[i].left || a[i].top !== b[i].top) return false;
  }
  return true;
}
