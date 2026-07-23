import { createTheme, liveTheme, cleanTheme } from "@axicharts/charts-theme";

export const axitypeLiveTheme = createTheme(liveTheme, {
  name: "axitype-live",
  tokens: {
    palette: ["#0F9F8A", "#FF5B2E"],
    grid: "#C5D3E5",
    axis: "#5A6B82",
  },
  axis: { show: false },
  caption: { show: false },
});

export const axitypeCleanTheme = createTheme(cleanTheme, {
  name: "axitype-clean",
  tokens: {
    palette: ["#0F9F8A", "#FF5B2E", "#5A6B82"],
    grid: "#C5D3E5",
    axis: "#5A6B82",
  },
});
