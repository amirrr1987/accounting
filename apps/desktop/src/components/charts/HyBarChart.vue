<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type { TooltipItem } from "chart.js";
import { useTheme } from "@/composables/useTheme";
import { chartDefaults } from "@/lib/chart-theme";
import { formatMoneyFa } from "@/lib/money";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps<{
  labels: string[];
  datasets: Array<{ label: string; data: number[]; colors: string[] }>;
  title?: string;
  stacked?: boolean;
}>();

const { isDark } = useTheme();

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets.map((ds) => ({
    label: ds.label,
    data: ds.data,
    backgroundColor: ds.colors,
    borderRadius: 6,
    borderSkipped: false,
  })),
}));

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  ...chartDefaults(isDark.value),
  scales: {
    x: {
      ...chartDefaults(isDark.value).scales.x,
      stacked: props.stacked ?? false,
    },
    y: {
      ...chartDefaults(isDark.value).scales.y,
      stacked: props.stacked ?? false,
    },
  },
  plugins: {
    ...chartDefaults(isDark.value).plugins,
    title: props.title
      ? { display: true, text: props.title, color: chartDefaults(isDark.value).color }
      : { display: false },
    tooltip: {
      ...chartDefaults(isDark.value).plugins.tooltip,
      callbacks: {
        label: (ctx: TooltipItem<"bar">) => {
          const y = ctx.parsed.y ?? 0;
          return `${ctx.dataset.label ?? ""}: ${formatMoneyFa(BigInt(Math.round(y)))}`;
        },
      },
    },
  },
}));
</script>

<template>
  <div class="h-72 w-full" dir="rtl">
    <Bar :data="chartData" :options="options" />
  </div>
</template>
