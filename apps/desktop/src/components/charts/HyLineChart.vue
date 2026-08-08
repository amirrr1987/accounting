<script setup lang="ts">
import { computed } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { TooltipItem } from "chart.js";
import { useTheme } from "@/composables/useTheme";
import { chartDefaults } from "@/lib/chart-theme";
import { formatMoneyFa } from "@/lib/money";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const props = defineProps<{
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
    fill?: boolean;
  }>;
  title?: string;
}>();

const { isDark } = useTheme();

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets.map((ds) => ({
    label: ds.label,
    data: ds.data,
    borderColor: ds.color,
    backgroundColor: ds.fill ? `${ds.color}33` : ds.color,
    tension: 0.35,
    fill: ds.fill ?? false,
    pointRadius: 4,
    pointHoverRadius: 6,
  })),
}));

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  ...chartDefaults(isDark.value),
  plugins: {
    ...chartDefaults(isDark.value).plugins,
    title: props.title
      ? { display: true, text: props.title, color: chartDefaults(isDark.value).color }
      : { display: false },
    tooltip: {
      ...chartDefaults(isDark.value).plugins.tooltip,
      callbacks: {
        label: (ctx: TooltipItem<"line">) => {
          const y = ctx.parsed.y ?? 0;
          return `${ctx.dataset.label ?? ""}: ${formatMoneyFa(BigInt(Math.round(y)))}`;
        },
      },
    },
  },
}));
</script>

<template>
  <div class="h-64 w-full" dir="rtl">
    <Line :data="chartData" :options="options" />
  </div>
</template>
