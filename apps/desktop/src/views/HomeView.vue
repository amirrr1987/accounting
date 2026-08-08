<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Tag from "primevue/tag";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type { DashboardSummary } from "@hesabyar/shared";
import { formatBusinessTitle } from "@hesabyar/shared";
import { fetchDashboard, fetchBusinessSettings } from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { applyMoneyDisplaySettings } from "@/composables/useMoneyDisplay";
import MoneySetupDialog from "@/components/MoneySetupDialog.vue";
import { useBackendHealth } from "@/composables/useBackendHealth";
import { ux } from "@/locale/ux-copy";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import HyLineChart from "@/components/charts/HyLineChart.vue";
import HyDoughnutChart from "@/components/charts/HyDoughnutChart.vue";
import { CHART_COLORS } from "@/lib/chart-theme";

const router = useRouter();
const toast = useToast();
const { status, version } = useBackendHealth();

const summary = ref<DashboardSummary | null>(null);
const businessTitle = ref<string | null>(null);
const loading = ref(false);
const loadFailed = ref(false);
const moneySetupOpen = ref(false);

const shortcuts = [
  { label: ux.vouchers.create, icon: "pi pi-plus", to: "/vouchers/new" },
  { label: ux.invoices.create, icon: "pi pi-file", to: "/invoices/new" },
  { label: ux.nav.accounts, icon: "pi pi-sitemap", to: "/accounts" },
  { label: ux.nav.ledger, icon: "pi pi-list", to: "/ledger" },
  { label: ux.nav.trialBalance, icon: "pi pi-chart-bar", to: "/trial-balance" },
  { label: ux.nav.parties, icon: "pi pi-users", to: "/parties" },
];

const healthLabel = computed(() => {
  if (status.value === "connected") return ux.health.connected;
  if (status.value === "checking") return ux.health.checking;
  return ux.health.disconnected;
});

const healthSeverity = computed(() => {
  if (status.value === "connected") return "success" as const;
  if (status.value === "checking") return "info" as const;
  return "danger" as const;
});

const ownershipChart = computed(() => {
  const slices = summary.value?.ownership?.slices ?? [];
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
  const trend = summary.value?.charts?.monthlyTrend ?? [];
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
  const mix = summary.value?.charts?.accountTypeMix ?? [];
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

async function load(): Promise<void> {
  loading.value = true;
  loadFailed.value = false;
  try {
    const [dash, business] = await Promise.all([
      fetchDashboard(),
      fetchBusinessSettings(),
    ]);
    summary.value = dash;
    businessTitle.value = formatBusinessTitle(business);
    applyMoneyDisplaySettings(business);
    if (!business.moneyDisplayConfigured) {
      moneySetupOpen.value = true;
    }
  } catch {
    loadFailed.value = true;
    toast.add({
      severity: "error",
      summary: ux.dashboard.loadErrorTitle,
      detail: ux.dashboard.loadErrorDetail,
      life: 4500,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="hy-page" dir="rtl">
    <Toast />
    <MoneySetupDialog v-model:visible="moneySetupOpen" />

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
      @action="load"
    />

    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <button
          v-for="card in [
            {
              label: ux.dashboard.cards.accounts,
              value: summary?.accountsCount,
              to: '/accounts',
            },
            {
              label: ux.dashboard.cards.parties,
              value: summary?.partiesCount,
              to: '/parties',
            },
            {
              label: ux.dashboard.cards.products,
              value: summary?.productsCount,
              to: '/products',
            },
            {
              label: ux.dashboard.cards.vouchers,
              value: summary?.vouchersCount,
              to: '/vouchers',
            },
            {
              label: ux.dashboard.cards.invoices,
              value: summary?.activeInvoicesCount,
              to: '/invoices',
            },
            {
              label: ux.dashboard.cards.balance,
              value: summary
                ? summary.isBalanced
                  ? ux.dashboard.cards.balanced
                  : ux.dashboard.cards.unbalanced
                : '—',
              to: '/trial-balance',
              alert: summary ? !summary.isBalanced : false,
            },
          ]"
          :key="card.label"
          type="button"
          class="hy-surface p-4 text-right transition-colors duration-200 hover:border-[var(--hy-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--hy-focus)]"
          @click="router.push(card.to)"
        >
          <p class="text-xs text-[var(--hy-muted)] m-0">{{ card.label }}</p>
          <p
            class="text-xl font-bold mt-1 mb-0"
            :class="
              card.alert
                ? 'text-[var(--hy-danger)]'
                : 'text-[var(--hy-text)]'
            "
          >
            {{ loading ? "…" : (card.value ?? "—") }}
          </p>
        </button>
      </div>

      <div class="hy-surface p-4 flex flex-wrap gap-6 items-end">
        <div>
          <p class="text-xs text-[var(--hy-muted)] m-0">
            {{ ux.dashboard.totalDebit }}
          </p>
          <p class="text-lg font-semibold text-[var(--hy-text)] m-0 mt-1">
            {{ summary ? formatMoneyFa(summary.totalDebit) : "—" }}
          </p>
        </div>
        <div>
          <p class="text-xs text-[var(--hy-muted)] m-0">
            {{ ux.dashboard.totalCredit }}
          </p>
          <p class="text-lg font-semibold text-[var(--hy-text)] m-0 mt-1">
            {{ summary ? formatMoneyFa(summary.totalCredit) : "—" }}
          </p>
        </div>
        <Tag
          v-if="summary"
          :value="
            summary.isBalanced
              ? ux.dashboard.balanceOk
              : ux.dashboard.balanceBad
          "
          :severity="summary.isBalanced ? 'success' : 'danger'"
          :icon="summary.isBalanced ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'"
        />
      </div>

      <section
        v-if="summary?.management"
        aria-labelledby="management-heading"
        class="hy-surface p-4"
      >
        <h2
          id="management-heading"
          class="text-lg font-bold text-[var(--hy-text)] mb-3 mt-0"
        >
          {{ ux.dashboard.managementTitle }}
        </h2>
        <p class="text-sm text-[var(--hy-muted)] m-0 mb-3">
          {{ ux.dashboard.totalLiquidity }}:
          <strong>{{ formatMoneyFa(summary.management.grandTotal) }}</strong>
        </p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div>
            <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.dashboard.cash }}</p>
            <p class="font-semibold m-0 mt-1">{{ formatMoneyFa(summary.management.totalCash) }}</p>
          </div>
          <div>
            <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.dashboard.bank }}</p>
            <p class="font-semibold m-0 mt-1">{{ formatMoneyFa(summary.management.totalBank) }}</p>
          </div>
          <div>
            <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.dashboard.inventory }}</p>
            <p class="font-semibold m-0 mt-1">{{ formatMoneyFa(summary.management.totalInventory) }}</p>
          </div>
          <div>
            <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.dashboard.checks }}</p>
            <p class="font-semibold m-0 mt-1">{{ formatMoneyFa(summary.management.totalChecks) }}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <Tag
            v-if="summary.management.checksDueThisWeek > 0"
            :value="`${ux.dashboard.checksDue}: ${summary.management.checksDueThisWeek}`"
            severity="warn"
            icon="pi pi-calendar"
          />
          <Tag
            v-if="summary.management.checksOverdue > 0"
            :value="`${ux.dashboard.checksOverdue}: ${summary.management.checksOverdue}`"
            severity="danger"
            icon="pi pi-exclamation-triangle"
          />
          <Tag
            v-if="summary.management.lowStockCount > 0"
            :value="`${ux.dashboard.lowStock}: ${summary.management.lowStockCount}`"
            severity="warn"
            icon="pi pi-box"
          />
          <Tag
            v-if="BigInt(summary.management.periodSaleLoss) > 0n"
            :value="`${ux.dashboard.saleLoss}: ${formatMoneyFa(summary.management.periodSaleLoss)}`"
            severity="danger"
          />
        </div>
        <ul
          v-if="summary.management.lowStockProducts.length > 0"
          class="mt-3 mb-0 text-sm text-[var(--hy-muted)] list-disc pr-5"
        >
          <li
            v-for="p in summary.management.lowStockProducts"
            :key="p.id"
          >
            {{ p.name }} ({{ p.sku }}) — {{ p.stockQty }} عدد
          </li>
        </ul>
      </section>

      <section
        v-if="ownershipChart && summary?.ownership"
        aria-labelledby="ownership-heading"
        class="hy-surface p-4"
      >
        <h2
          id="ownership-heading"
          class="text-lg font-bold text-[var(--hy-text)] mb-3 mt-0"
        >
          تفکیک سهم شرکا
          <Tag
            class="mr-2"
            :value="summary.ownership.isShareValid ? '۱۰۰٪' : `${summary.ownership.sharePercentTotal}٪`"
            :severity="summary.ownership.isShareValid ? 'success' : 'warn'"
          />
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HyDoughnutChart
            :labels="ownershipChart.labels"
            :data="ownershipChart.data"
            :colors="ownershipChart.colors"
            title="سهم از خالص دارایی"
          />
          <div class="flex flex-col justify-center gap-2 text-sm">
            <p class="m-0">دارایی: {{ formatMoneyFa(summary.ownership.totalAssets) }}</p>
            <p class="m-0">بدهی: {{ formatMoneyFa(summary.ownership.totalLiabilities) }}</p>
            <p class="m-0 font-semibold">خالص: {{ formatMoneyFa(summary.ownership.netEquity) }}</p>
            <Button
              :label="ux.nav.partners"
              icon="pi pi-share-alt"
              outlined
              class="min-h-11 mt-2 w-fit"
              @click="router.push('/partners')"
            />
          </div>
        </div>
      </section>

      <section v-if="summary?.charts" aria-labelledby="charts-heading">
        <h2
          id="charts-heading"
          class="text-lg font-bold text-[var(--hy-text)] mb-3 mt-2"
        >
          {{ ux.reports.chartsTitle }}
          <span
            v-if="summary.fiscalYearTitle"
            class="text-sm font-normal text-[var(--hy-muted)]"
          >
            · سال مالی {{ summary.fiscalYearTitle }}
          </span>
        </h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
          <div class="hy-surface p-4 flex flex-col justify-center gap-2">
            <p class="text-xs text-[var(--hy-muted)] m-0">
              {{ ux.reports.arAp }}
            </p>
            <p class="m-0">
              دریافتنی:
              <strong>{{
                formatMoneyFa(summary.charts.arAp.receivable)
              }}</strong>
            </p>
            <p class="m-0">
              پرداختنی:
              <strong>{{
                formatMoneyFa(summary.charts.arAp.payable)
              }}</strong>
            </p>
            <Button
              :label="ux.nav.reports"
              icon="pi pi-chart-line"
              outlined
              class="min-h-11 mt-2"
              @click="router.push('/reports')"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="shortcuts-heading">
        <h2
          id="shortcuts-heading"
          class="text-lg font-bold text-[var(--hy-text)] mb-3 mt-0"
        >
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
        <p class="text-xs text-[var(--hy-muted)] mt-2 mb-0">
          {{ ux.dashboard.shortcutsHint }}
        </p>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section class="hy-surface p-4" aria-labelledby="recent-vouchers">
          <div class="flex items-center justify-between mb-3 gap-2">
            <h2
              id="recent-vouchers"
              class="font-bold text-[var(--hy-text)] m-0 text-base"
            >
              {{ ux.dashboard.recentVouchers }}
            </h2>
            <Button
              :label="ux.dashboard.seeAll"
              text
              size="small"
              class="min-h-11"
              @click="router.push('/vouchers')"
            />
          </div>
          <EmptyState
            v-if="!loading && (summary?.recentVouchers.length ?? 0) === 0"
            :title="ux.dashboard.emptyVouchersTitle"
            :description="ux.dashboard.emptyVouchersBody"
            icon="pi pi-book"
            :action-label="ux.dashboard.emptyVouchersCta"
            @action="router.push('/vouchers/new')"
          />
          <DataTable
            v-else
            :value="summary?.recentVouchers ?? []"
            :loading="loading"
            class="text-sm"
            size="small"
          >
            <Column field="number" header="شماره" />
            <Column field="dateJalali" header="تاریخ" />
            <Column field="description" header="شرح" />
            <Column header="مبلغ">
              <template #body="{ data }">
                {{ formatMoneyFa(data.totalDebit) }}
              </template>
            </Column>
          </DataTable>
        </section>

        <section class="hy-surface p-4" aria-labelledby="recent-invoices">
          <div class="flex items-center justify-between mb-3 gap-2">
            <h2
              id="recent-invoices"
              class="font-bold text-[var(--hy-text)] m-0 text-base"
            >
              {{ ux.dashboard.recentInvoices }}
            </h2>
            <Button
              :label="ux.dashboard.seeAll"
              text
              size="small"
              class="min-h-11"
              @click="router.push('/invoices')"
            />
          </div>
          <EmptyState
            v-if="!loading && (summary?.recentInvoices.length ?? 0) === 0"
            :title="ux.dashboard.emptyInvoicesTitle"
            :description="ux.dashboard.emptyInvoicesBody"
            icon="pi pi-file"
            :action-label="ux.dashboard.emptyInvoicesCta"
            @action="router.push('/invoices/new')"
          />
          <DataTable
            v-else
            :value="summary?.recentInvoices ?? []"
            :loading="loading"
            class="text-sm"
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
      </div>
    </template>
  </div>
</template>
