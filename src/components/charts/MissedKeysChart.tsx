import { BarChart, ChartContainer } from "@axicharts/charts/bar";
import { axitypeCleanTheme } from "../../lib/chartTheme";

interface MissedKeysChartProps {
  entries: { key: string; count: number }[];
}

export function MissedKeysChart({ entries }: MissedKeysChartProps) {
  if (entries.length === 0) {
    return <p style={{ color: "var(--ink-muted)" }}>No miss data yet.</p>;
  }
  const top = entries.slice(0, 8);
  return (
    <ChartContainer theme={axitypeCleanTheme} height={240} mode="static">
      <BarChart
        categories={top.map((e) => (e.key === " " ? "␣" : e.key))}
        series={[{ name: "Misses", data: top.map((e) => e.count) }]}
        orientation="horizontal"
      />
    </ChartContainer>
  );
}
