/** رنگ‌های نمودار حساب‌یار — هماهنگ با design-system */
export const CHART_COLORS = {
  primary: "#1E3A5F",
  accent: "#10B981",
  sales: "#3B82F6",
  purchase: "#F59E0B",
  receipt: "#10B981",
  payment: "#EF4444",
  asset: "#1E3A5F",
  liability: "#8B5CF6",
  equity: "#06B6D4",
  income: "#22C55E",
  expense: "#EF4444",
  muted: "#94A3B8",
} as const;

export const CHART_FONT = "'Vazirmatn', system-ui, sans-serif";

export function chartDefaults(isDark: boolean) {
  const text = isDark ? "#E2E8F0" : "#334155";
  const grid = isDark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.25)";
  return {
    color: text,
    font: { family: CHART_FONT },
    plugins: {
      legend: {
        rtl: true,
        labels: { color: text, font: { family: CHART_FONT } },
      },
      tooltip: {
        rtl: true,
        titleFont: { family: CHART_FONT },
        bodyFont: { family: CHART_FONT },
      },
    },
    scales: {
      x: { ticks: { color: text }, grid: { color: grid } },
      y: { ticks: { color: text }, grid: { color: grid } },
    },
  };
}
