import { QuickLineChart } from "@axicharts/charts/quick";
import { keylaneLiveTheme } from "../../lib/chartTheme";
import styles from "./LiveWpmChart.module.css";

interface LiveWpmChartProps {
  data: number[];
  live?: boolean;
}

export function LiveWpmChart({ data, live = true }: LiveWpmChartProps) {
  const series = data.length > 0 ? data : [0];
  return (
    <div className={styles.wrap} aria-hidden="true">
      <QuickLineChart
        data={series}
        height={80}
        theme={keylaneLiveTheme}
        mode={live ? "live" : "static"}
        name="WPM"
        fill
        className={styles.chart}
      />
    </div>
  );
}
