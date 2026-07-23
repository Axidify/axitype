import { QuickLineChart } from "@axicharts/charts/quick";
import { axitypeLiveTheme } from "../../lib/chartTheme";
import styles from "./LiveWpmChart.module.css";

interface LiveWpmChartProps {
  data: number[];
  live?: boolean;
  /** Final WPM shown in the results hero — used for the caption. */
  finalWpm?: number;
}

/** Skip the first ~2s of samples — early WPM is inflated by tiny elapsed time. */
const SETTLE_SAMPLES = 8;

function displaySeries(data: number[]): number[] {
  if (data.length <= SETTLE_SAMPLES) return data.length > 0 ? data : [0];
  return data.slice(SETTLE_SAMPLES);
}

export function LiveWpmChart({ data, live = true, finalWpm }: LiveWpmChartProps) {
  const series = displaySeries(data);
  const end = series[series.length - 1] ?? 0;
  const peak = series.length > 0 ? Math.max(...series) : 0;
  const captionWpm = finalWpm ?? end;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{live ? "Live speed" : "Speed this round"}</p>
          <p className={styles.subtitle}>Words per minute from start → finish</p>
        </div>
        {!live && (
          <p className={styles.summary}>
            Final <strong>{captionWpm}</strong>
            {peak > 0 && peak !== captionWpm ? <> · peak {peak}</> : null}
          </p>
        )}
      </div>
      <QuickLineChart
        data={series}
        height={live ? 80 : 120}
        theme={axitypeLiveTheme}
        mode={live ? "live" : "static"}
        name="WPM"
        fill
        className={styles.chart}
      />
      <div className={styles.axis} aria-hidden="true">
        <span>Start</span>
        <span>End</span>
      </div>
    </div>
  );
}
