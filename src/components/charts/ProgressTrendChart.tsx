import { QuickLineChart } from "@axicharts/charts/quick";
import { axitypeCleanTheme } from "../../lib/chartTheme";
import { formatTrendDelta, halfTrendDelta, mean } from "../../lib/statsSummary";
import styles from "./ProgressTrendChart.module.css";

interface ProgressTrendChartProps {
  wpm: number[];
  accuracy: number[];
  labels?: string[];
}

export function ProgressTrendChart({ wpm, accuracy, labels }: ProgressTrendChartProps) {
  if (wpm.length === 0) {
    return <p className={styles.empty}>Play a few rounds to see trends.</p>;
  }

  const avgWpm = mean(wpm);
  const avgAcc = mean(accuracy);

  return (
    <div className={styles.wrap}>
      <div className={styles.summary}>
        <div>
          <span className={styles.summaryLabel}>Avg WPM</span>
          <strong>{avgWpm == null ? "—" : Math.round(avgWpm)}</strong>
          <p className={styles.trend}>{formatTrendDelta(halfTrendDelta(wpm), "wpm")}</p>
        </div>
        <div>
          <span className={styles.summaryLabel}>Avg accuracy</span>
          <strong>{avgAcc == null ? "—" : `${Math.round(avgAcc)}%`}</strong>
          <p className={styles.trend}>{formatTrendDelta(halfTrendDelta(accuracy), "accuracy")}</p>
        </div>
      </div>

      <div className={styles.charts}>
        <div className={styles.chartBlock}>
          <p className={styles.chartTitle}>WPM</p>
          <QuickLineChart
            data={wpm}
            labels={labels}
            height={180}
            theme={axitypeCleanTheme}
            mode="static"
            name="WPM"
            fill
          />
        </div>
        <div className={styles.chartBlock}>
          <p className={styles.chartTitle}>Accuracy %</p>
          <QuickLineChart
            data={accuracy}
            labels={labels}
            height={180}
            theme={axitypeCleanTheme}
            mode="static"
            name="Accuracy"
            fill
          />
        </div>
      </div>
    </div>
  );
}
