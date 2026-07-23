import { QuickLineChart } from "@axicharts/charts/quick";
import { axitypeCleanTheme } from "../../lib/chartTheme";

interface ProgressTrendChartProps {
  wpm: number[];
  labels?: string[];
}

export function ProgressTrendChart({ wpm, labels }: ProgressTrendChartProps) {
  if (wpm.length === 0) {
    return <p style={{ color: "var(--ink-muted)" }}>Play a few rounds to see trends.</p>;
  }
  return (
    <QuickLineChart
      data={wpm}
      labels={labels}
      height={220}
      theme={axitypeCleanTheme}
      mode="static"
      name="WPM"
      fill
      title="Recent WPM"
    />
  );
}
