<script setup lang="ts">
import { computed } from "vue";
import type { DashboardSummary } from "@hesabyar/shared";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Tag from "primevue/tag";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import { formatMoneyFa } from "@/lib/money";
import { useExperienceMode } from "@/composables/useExperienceMode";
import { ux } from "@/locale/ux-copy";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import HyLineChart from "@/components/charts/HyLineChart.vue";
import HyDoughnutChart from "@/components/charts/HyDoughnutChart.vue";
import { CHART_COLORS } from "@/lib/chart-theme";

const props = defineProps<{
  summary: DashboardSummary | null;
  businessTitle: string | null;
  loading: boolean;
  loadFailed: boolean;
  healthLabel: string;
  healthSeverity: "success" | "info" | "danger";
  version?: string | null;
}>();

const emit = defineEmits<{ retry: [] }>();

const router = useRouter();
const { isPro } = useExperienceMode();

const ownershipChart = computed(() => {
  const slices = props.summary?.ownership?.slices ?? [];
  if (slices.length === 0) return null;
  const colorMap = [
    CHART_COLORS.primary,
    CHART_COLORS.accent,
    CHART_COLORS.income,
    CHART_COLORS.equity,
    CHART_COLORS.expense,
  ];
  return {
    labels: slices.map((s) => s.label),
    data: slices.map((s) => Number(s.amount)),
    colors: slices.map((_, i) => colorMap[i % colorMap.length] ?? CHART_COLORS.muted),
  };
});

const trendChart = computed(() => {
  const trend = props.summary?.charts?.monthlyTrend ?? [];
  if (trend.length === 0) return null;
  return {
    labels: trend.map((t) => t.monthLabel),
    datasets: [
      {
        label: "فروش",
        data: trend.map((t) => Number(t.sales)),
        color: CHART_COLORS.sales,
        fill: true,
      },
      {
        label: "خرید",
        data: trend.map((t) => Number(t.purchases)),
        color: CHART_COLORS.purchase,
        fill: true,
      },
    ],
  };
});

const mixChart = computed(() => {
  const mix = props.summary?.charts?.accountTypeMix ?? [];
  const filtered = mix.filter((m) => BigInt(m.amount) > 0n);
  if (filtered.length === 0) return null;
  const colorMap: Record<string, string> = {
    ASSET: CHART_COLORS.asset,
    LIABILITY: CHART_COLORS.liability,
    EQUITY: CHART_COLORS.equity,
    INCOME: CHART_COLORS.income,
    EXPENSE: CHART_COLORS.expense,
  };
  return {
    labels: filtered.map((m) => m.label),
    data: filtered.map((m) => Number(m.amount)),
    colors: filtered.map((m) => colorMap[m.type] ?? CHART_COLORS.muted),
  };
});

const shortcuts = [
  { label: ux.quickActions.sale, icon: "pi pi-shopping-cart", to: "/invoices/new" },
  { label: ux.quickActions.receipt, icon: "pi pi-wallet", to: "/payments/new" },
  { label: ux.nav.partiesSimple, icon: "pi pi-users", to: "/parties" },
  { label: ux.nav.reportsSimple, icon: "pi pi-chart-line", to: "/reports" },
];
</script>

<template>
  <div class="hy-page space-y-5 sm:space-y-6" dir="rtl">
    <PageHeader
      :title="businessTitle ?? ux.dashboard.title"
      :subtitle="ux.dashboard.subtitle(summary?.asOfJalali)"
    >
      <template #actions>
        <Tag :value="healthLabel" :severity="healthSeverity" rounded />
        <span v-if="version" class="text-xs text-[var(--hy-muted)]">
          v{{ version }}
        </span>
      </template>
    </PageHeader>

    <EmptyState
      v-if="loadFailed && !summary"
      :title="ux.dashboard.loadErrorTitle"
      :description="ux.dashboard.loadErrorDetail"
      icon="pi pi-wifi"
      :action-label="ux.common.retry"
      @action="emit('retry')"
    />

    <template v-else>
      <section
        v-if="summary?.management"
        class="hy-surface p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center"
      >
        <div>
          <p class="text-sm text-[var(--hy-muted)] m-0">
            {{ ux.dashboard.totalMoneySimple }}
          </p>
          <p class="text-3xl font-bold m-0 mt-1 text-[var(--hy-primary)]">
            {{ loading ? "…" : formatMoneyFa(summary.management.grandTotal) }}
          </p>
          <p class="text-xs text-[var(--hy-muted)] m-0 mt-2">
            {{ ux.dashboard.totalMoneyHint }}
          </p>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.dashboard.cash }}</p>
            <p class="font-semibold m-0 mt-1">
              {{ formatMoneyFa(summary.management.totalCash) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.dashboard.bank }}</p>
            <p class="font-semibold m-0 mt-1">
              {{ formatMoneyFa(summary.management.totalBank) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.dashboard.inventory }}</p>
            <p class="font-semibold m-0 mt-1">
              {{ formatMoneyFa(summary.management.totalInventory) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.dashboard.checks }}</p>
            <p class="font-semibold m-0 mt-1">
              {{ formatMoneyFa(summary.management.totalChecks) }}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="shortcuts-d">
        <h2 id="shortcuts-d" class="text-lg font-bold m-0 mb-3">
          {{ ux.dashboard.shortcutsTitle }}
        </h2>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="s in shortcuts"
            :key="s.to"
            :label="s.label"
            :icon="s.icon"
            outlined
            class="min-h-11"
            @click="router.push(s.to)"
          />
        </div>
      </section>

      <section
        v-if="isPro && summary?.management"
        aria-labelledby="management-heading"
        class="hy-surface p-4"
      >
        <h2
          id="management-heading"
          class="text-lg font-bold text-[var(--hy-text)] mb-3 mt-0"
        >
          {{ ux.dashboard.managementTitle }}
        </h2>
        <div class="flex flex-wrap gap-2 mb-3">
          <Tag
            v-if="summary.management.checksDueThisWeek > 0"
            :value="`${ux.dashboard.checksDue}: ${summary.management.checksDueThisWeek}`"
            severity="warn"
          />
          <Tag
            v-if="summary.management.checksOverdue > 0"
            :value="`${ux.dashboard.checksOverdue}: ${summary.management.checksOverdue}`"
            severity="danger"
          />
          <Tag
            v-if="summary.management.lowStockCount > 0"
            :value="`${ux.dashboard.lowStock}: ${summary.management.lowStockCount}`"
            severity="warn"
          />
          <Tag
            v-if="summary"
            :value="
              summary.isBalanced
                ? ux.dashboard.balanceOk
                : ux.dashboard.balanceBad
            "
            :severity="summary.isBalanced ? 'success' : 'danger'"
          />
        </div>
      </section>

      <section
        v-if="isPro"
        aria-labelledby="pro-heading"
        class="space-y-4"
      >
        <div>
          <h2 id="pro-heading" class="text-lg font-bold m-0">
            {{ ux.dashboard.proSectionTitle }}
          </h2>
          <p class="text-sm text-[var(--hy-muted)] m-0 mt-1">
            {{ ux.dashboard.proSectionHint }}
          </p>
        </div>

        <div class="hy-surface p-4 flex flex-wrap gap-6 items-end">
          <div>
            <p class="text-xs text-[var(--hy-muted)] m-0">
              {{ ux.dashboard.totalDebit }}
            </p>
            <p class="text-lg font-semibold m-0 mt-1">
              {{ summary ? formatMoneyFa(summary.totalDebit) : "—" }}
            </p>
          </div>
          <div>
            <p class="text-xs text-[var(--hy-muted)] m-0">
              {{ ux.dashboard.totalCredit }}
            </p>
            <p class="text-lg font-semibold m-0 mt-1">
              {{ summary ? formatMoneyFa(summary.totalCredit) : "—" }}
            </p>
          </div>
        </div>

        <div
          v-if="summary?.charts"
          class="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <div v-if="trendChart" class="hy-surface p-4 lg:col-span-2">
            <HyLineChart
              :labels="trendChart.labels"
              :datasets="trendChart.datasets"
              :title="ux.reports.monthlyTrend"
            />
          </div>
          <div v-if="mixChart" class="hy-surface p-4">
            <HyDoughnutChart
              :labels="mixChart.labels"
              :data="mixChart.data"
              :colors="mixChart.colors"
              :title="ux.reports.accountMix"
            />
          </div>
        </div>

        <section
          v-if="ownershipChart && summary?.ownership"
          class="hy-surface p-4"
        >
          <HyDoughnutChart
            :labels="ownershipChart.labels"
            :data="ownershipChart.data"
            :colors="ownershipChart.colors"
            title="سهم شرکا"
          />
        </section>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section class="hy-surface p-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-bold m-0 text-base">{{ ux.dashboard.recentInvoices }}</h2>
            <Button
              :label="ux.dashboard.seeAll"
              text
              size="small"
              @click="router.push('/invoices')"
            />
          </div>
          <DataTable
            :value="summary?.recentInvoices ?? []"
            :loading="loading"
            size="small"
          >
            <Column field="number" header="شماره" />
            <Column header="نوع">
              <template #body="{ data }">
                {{ data.kind === "SALE" ? "فروش" : "خرید" }}
              </template>
            </Column>
            <Column field="partyName" header="طرف‌حساب" />
            <Column header="جمع">
              <template #body="{ data }">
                {{ formatMoneyFa(data.total) }}
              </template>
            </Column>
          </DataTable>
        </section>

        <section v-if="isPro" class="hy-surface p-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-bold m-0 text-base">{{ ux.dashboard.recentVouchers }}</h2>
            <Button
              :label="ux.dashboard.seeAll"
              text
              size="small"
              @click="router.push('/vouchers')"
            />
          </div>
          <DataTable
            :value="summary?.recentVouchers ?? []"
            :loading="loading"
            size="small"
          >
            <Column field="number" header="شماره" />
            <Column field="dateJalali" header="تاریخ" />
            <Column header="مبلغ">
              <template #body="{ data }">
                {{ formatMoneyFa(data.totalDebit) }}
              </template>
            </Column>
          </DataTable>
        </section>
      </div>
    </template>
  </div>
</template>
