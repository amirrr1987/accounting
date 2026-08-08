<script setup lang="ts">
import { computed } from "vue";
import { Doughnut } from "vue-chartjs";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import type { TooltipItem } from "chart.js";
import { useTheme } from "@/composables/useTheme";
import { chartDefaults } from "@/lib/chart-theme";
import { formatMoneyFa } from "@/lib/money";

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps<{
  labels: string[];
  data: number[];
  colors: string[];
  title?: string;
}>();

const { isDark } = useTheme();

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.data,
      backgroundColor: props.colors,
      borderWidth: 0,
      hoverOffset: 8,
    },
  ],
}));

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: "62%",
  ...chartDefaults(isDark.value),
  plugins: {
    ...chartDefaults(isDark.value).plugins,
    title: props.title
      ? { display: true, text: props.title, color: chartDefaults(isDark.value).color }
      : { display: false },
    tooltip: {
      ...chartDefaults(isDark.value).plugins.tooltip,
      callbacks: {
        label: (ctx: TooltipItem<"doughnut">) => {
          const v = ctx.parsed ?? 0;
          return `${ctx.label ?? ""}: ${formatMoneyFa(BigInt(Math.round(v)))}`;
        },
      },
    },
  },
}));
</script>

<template>
  <div class="h-64 w-full max-w-sm mx-auto" dir="rtl">
    <Doughnut :data="chartData" :options="options" />
  </div>
</template>
