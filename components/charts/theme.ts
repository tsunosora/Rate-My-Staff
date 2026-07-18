import type { ScriptableContext, TooltipOptions } from "chart.js";

/**
 * Shared chart chrome for the glassmorphism design system.
 * Mid-tone ticks/grid stay legible on both dark and light themes.
 */

export const TICK = "#94a3b8"; // slate-400
export const GRID = "rgba(148,163,184,0.10)";

// Data palette (matches CSS tokens; chart.js needs literal colors)
export const C = {
  primary: "#818cf8",
  violet: "#a78bfa",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#60a5fa",
};

/** Frosted-dark tooltip, consistent across every chart. */
export const glassTooltip: Partial<TooltipOptions> = {
  padding: 12,
  cornerRadius: 12,
  backgroundColor: "rgba(15,23,42,0.92)",
  titleColor: "#f1f5f9",
  bodyColor: "#cbd5e1",
  titleFont: { size: 12, weight: 600 },
  bodyFont: { size: 12 },
  boxWidth: 8,
  boxHeight: 8,
  boxPadding: 4,
  usePointStyle: true,
  displayColors: true,
} as Partial<TooltipOptions>;

/** Y axis: hairline dashed grid, sparse small ticks, no border. */
export const cleanY = {
  border: { display: false },
  grid: { color: GRID, drawTicks: false, lineWidth: 1 },
  ticks: {
    color: TICK,
    font: { size: 10 },
    maxTicksLimit: 5,
    padding: 8,
  },
};

/** X axis: no grid at all, small muted labels. */
export const cleanX = {
  border: { display: false },
  grid: { display: false, drawTicks: false },
  ticks: { color: TICK, font: { size: 10 }, padding: 4 },
};

/** Dot-style legend, top-right, small & airy. */
export const dotLegend = {
  position: "top" as const,
  align: "end" as const,
  labels: {
    color: TICK,
    usePointStyle: true,
    pointStyle: "circle" as const,
    boxWidth: 6,
    boxHeight: 6,
    padding: 16,
    font: { size: 11 },
  },
};

/** Vertical gradient fill that fades to transparent (for area lines). */
export function areaGradient(hex: string, from = 0.32) {
  return (ctx: ScriptableContext<"line">) => {
    const { chart } = ctx;
    const { ctx: c, chartArea } = chart;
    if (!chartArea) return hexA(hex, from * 0.5);
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, hexA(hex, from));
    g.addColorStop(1, hexA(hex, 0));
    return g;
  };
}

function hexA(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Fully-rounded slim "pill" bars (like the reference dashboards). */
export const pillBars = {
  borderRadius: Number.MAX_SAFE_INTEGER,
  borderSkipped: false as const,
  maxBarThickness: 10,
  categoryPercentage: 0.55,
  barPercentage: 0.75,
};
