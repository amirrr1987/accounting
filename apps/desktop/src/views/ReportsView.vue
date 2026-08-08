<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import Button from "primevue/button";
import Select from "primevue/select";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type {
  BalanceSheetReport,
  Party,
  ProfitLossReport,
  PartyStatementReport,
  VatReport,
  CashFlowReport,
  CheckReport,
  InventoryKardexReport,
  OwnerStatusReport,
  PartnerBalanceReport,
  Product,
} from "@hesabyar/shared";
import { todayJalali } from "@hesabyar/shared";
import {
  fetchBalanceSheet,
  fetchParties,
  fetchPartyStatement,
  fetchProfitLoss,
  fetchVatReport,
  fetchCashFlowReport,
  fetchCheckReport,
  fetchInventoryKardex,
  fetchOwnerStatusReport,
  fetchPartnerBalances,
  fetchProducts,
} from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { CHART_COLORS } from "@/lib/chart-theme";
import { usePageCopy } from "@/composables/usePageCopy";
import PageHeader from "@/components/PageHeader.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import HyBarChart from "@/components/charts/HyBarChart.vue";
import HyDoughnutChart from "@/components/charts/HyDoughnutChart.vue";
import { ux } from "@/locale/ux-copy";

const toast = useToast();
const { copy: pageCopy, isMobile } = usePageCopy("reports");
const loading = ref(false);

const fromJalali = ref(`${todayJalali().split("/")[0]}/01/01`);
const toJalali = ref(todayJalali());
const asOfJalali = ref(todayJalali());

const profitLoss = ref<ProfitLossReport | null>(null);
const balanceSheet = ref<BalanceSheetReport | null>(null);

const parties = ref<Party[]>([]);
const partyId = ref<string | null>(null);
const partyStatement = ref<PartyStatementReport | null>(null);
const vatReport = ref<VatReport | null>(null);
const cashFlow = ref<CashFlowReport | null>(null);
const checkReport = ref<CheckReport | null>(null);
const kardex = ref<InventoryKardexReport | null>(null);
const ownerStatus = ref<OwnerStatusReport | null>(null);
const partnerBalances = ref<PartnerBalanceReport | null>(null);
const products = ref<Product[]>([]);
const productId = ref<string | null>(null);

const plChart = computed(() => {
  if (!profitLoss.value) return null;
  return {
    labels: ["درآمد", "هزینه", "سود خالص"],
    data: [
      Number(profitLoss.value.incomeTotal),
      Number(profitLoss.value.expenseTotal),
      Number(profitLoss.value.netProfit),
    ],
    colors: [CHART_COLORS.income, CHART_COLORS.expense, CHART_COLORS.accent],
  };
});

const bsChart = computed(() => {
  if (!balanceSheet.value) return null;
  return {
    labels: ["دارایی", "بدهی", "حقوق صاحبان سهام"],
    data: [
      Number(balanceSheet.value.assets),
      Number(balanceSheet.value.liabilities),
      Number(balanceSheet.value.equity),
    ],
    colors: [CHART_COLORS.asset, CHART_COLORS.liability, CHART_COLORS.equity],
  };
});

async function loadProfitLoss(): Promise<void> {
  loading.value = true;
  try {
    profitLoss.value = await fetchProfitLoss(fromJalali.value, toJalali.value);
  } catch {
    toast.add({ severity: "error", summary: ux.reports.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function loadBalanceSheet(): Promise<void> {
  loading.value = true;
  try {
    balanceSheet.value = await fetchBalanceSheet(asOfJalali.value);
  } catch {
    toast.add({ severity: "error", summary: ux.reports.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function loadPartyStatement(): Promise<void> {
  if (!partyId.value) return;
  loading.value = true;
  try {
    partyStatement.value = await fetchPartyStatement(
      partyId.value,
      fromJalali.value,
      toJalali.value,
    );
  } catch {
    toast.add({ severity: "error", summary: ux.reports.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function loadVatReport(): Promise<void> {
  loading.value = true;
  try {
    vatReport.value = await fetchVatReport(fromJalali.value, toJalali.value);
  } catch {
    toast.add({ severity: "error", summary: ux.reports.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function loadCashFlow(): Promise<void> {
  loading.value = true;
  try {
    cashFlow.value = await fetchCashFlowReport(fromJalali.value, toJalali.value);
  } catch {
    toast.add({ severity: "error", summary: ux.reports.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function loadCheckReport(): Promise<void> {
  loading.value = true;
  try {
    checkReport.value = await fetchCheckReport(fromJalali.value, toJalali.value);
  } catch {
    toast.add({ severity: "error", summary: ux.reports.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function loadKardex(): Promise<void> {
  if (!productId.value) return;
  loading.value = true;
  try {
    kardex.value = await fetchInventoryKardex(
      productId.value,
      fromJalali.value,
      toJalali.value,
    );
  } catch {
    toast.add({ severity: "error", summary: ux.reports.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function loadOwnerStatus(): Promise<void> {
  loading.value = true;
  try {
    ownerStatus.value = await fetchOwnerStatusReport(
      fromJalali.value,
      toJalali.value,
    );
  } catch {
    toast.add({ severity: "error", summary: ux.reports.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function loadPartnerBalances(): Promise<void> {
  loading.value = true;
  try {
    partnerBalances.value = await fetchPartnerBalances(
      fromJalali.value,
      toJalali.value,
    );
  } catch {
    toast.add({ severity: "error", summary: ux.reports.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const [pts, prods] = await Promise.all([fetchParties(), fetchProducts()]);
  parties.value = pts;
  products.value = prods.filter((p) => p.isActive);
  if (products.value[0]) productId.value = products.value[0].id;
  await Promise.all([loadProfitLoss(), loadBalanceSheet(), loadVatReport()]);
});
</script>

<template>
  <div :class="isMobile ? 'hy-page-mobile space-y-4' : 'hy-page'" dir="rtl">
    <Toast />
    <PageHeader
      :title="pageCopy.title"
      :subtitle="pageCopy.subtitle"
      :hint="pageCopy.hint"
    />

    <TabView>
      <TabPanel header="سود و زیان" value="0">
        <div class="flex flex-wrap gap-3 mb-4 items-end">
          <JalaliDatePicker v-model="fromJalali" label="از تاریخ" />
          <JalaliDatePicker v-model="toJalali" label="تا تاریخ" />
          <Button
            :label="ux.reports.run"
            icon="pi pi-chart-bar"
            class="min-h-11"
            :loading="loading"
            @click="loadProfitLoss"
          />
        </div>

        <template v-if="profitLoss && plChart">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div class="hy-surface p-4">
              <HyBarChart
                :labels="plChart.labels"
                :datasets="[
                  {
                    label: 'مبلغ (ریال)',
                    data: plChart.data,
                    colors: plChart.colors,
                  },
                ]"
                title="خلاصه سود و زیان"
              />
            </div>
            <div class="hy-surface p-4 flex flex-col justify-center gap-3">
              <div>
                <p class="text-xs text-[var(--hy-muted)] m-0">جمع درآمد</p>
                <p class="text-lg font-bold text-[var(--hy-success)] m-0">
                  {{ formatMoneyFa(profitLoss.incomeTotal) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-[var(--hy-muted)] m-0">جمع هزینه</p>
                <p class="text-lg font-bold text-[var(--hy-danger)] m-0">
                  {{ formatMoneyFa(profitLoss.expenseTotal) }}
                </p>
              </div>
              <Tag
                :value="`سود خالص: ${formatMoneyFa(profitLoss.netProfit)}`"
                :severity="
                  BigInt(profitLoss.netProfit) >= 0n ? 'success' : 'danger'
                "
              />
            </div>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DataTable :value="profitLoss.incomeRows" size="small">
              <Column field="code" header="کد" />
              <Column field="name" header="درآمد" />
              <Column header="مبلغ">
                <template #body="{ data }">
                  {{ formatMoneyFa(data.amount) }}
                </template>
              </Column>
            </DataTable>
            <DataTable :value="profitLoss.expenseRows" size="small">
              <Column field="code" header="کد" />
              <Column field="name" header="هزینه" />
              <Column header="مبلغ">
                <template #body="{ data }">
                  {{ formatMoneyFa(data.amount) }}
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </TabPanel>

      <TabPanel header="ترازنامه" value="1">
        <div class="flex flex-wrap gap-3 mb-4 items-end">
          <JalaliDatePicker v-model="asOfJalali" label="تا تاریخ" />
          <Button
            :label="ux.reports.run"
            icon="pi pi-chart-pie"
            class="min-h-11"
            :loading="loading"
            @click="loadBalanceSheet"
          />
        </div>

        <template v-if="balanceSheet && bsChart">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div class="hy-surface p-4">
              <HyDoughnutChart
                :labels="bsChart.labels"
                :data="bsChart.data"
                :colors="bsChart.colors"
                title="ترکیب ترازنامه"
              />
            </div>
            <div class="hy-surface p-4 space-y-2">
              <Tag
                :value="
                  balanceSheet.isBalanced
                    ? ux.reports.bsBalanced
                    : ux.reports.bsUnbalanced
                "
                :severity="balanceSheet.isBalanced ? 'success' : 'danger'"
              />
              <p class="m-0">
                دارایی: {{ formatMoneyFa(balanceSheet.assets) }}
              </p>
              <p class="m-0">
                بدهی + حقوق: {{ formatMoneyFa(balanceSheet.liabilitiesPlusEquity) }}
              </p>
            </div>
          </div>
          <div
            v-for="section in balanceSheet.sections"
            :key="section.type"
            class="hy-surface p-4 mb-3"
          >
            <h3 class="font-bold mt-0">{{ section.label }}</h3>
            <DataTable :value="section.rows" size="small">
              <Column field="code" header="کد" />
              <Column field="name" header="حساب" />
              <Column header="مانده">
                <template #body="{ data }">
                  {{ formatMoneyFa(data.amount) }}
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </TabPanel>

      <TabPanel header="ریز حساب اشخاص" value="2">
        <div class="flex flex-wrap gap-3 mb-4 items-end">
          <div class="flex flex-col gap-1 min-w-[12rem]">
            <label class="text-sm text-[var(--hy-muted)]">طرف‌حساب</label>
            <Select
              v-model="partyId"
              :options="parties"
              option-label="name"
              option-value="id"
              placeholder="انتخاب کنید"
              filter
              class="w-full"
            />
          </div>
          <JalaliDatePicker v-model="fromJalali" label="از" />
          <JalaliDatePicker v-model="toJalali" label="تا" />
          <Button
            :label="ux.reports.run"
            icon="pi pi-users"
            class="min-h-11"
            :loading="loading"
            @click="loadPartyStatement"
          />
        </div>

        <div v-if="partyStatement" class="hy-surface p-4">
          <p class="text-sm text-[var(--hy-muted)]">
            مانده افتتاحیه: {{ formatMoneyFa(partyStatement.openingBalance) }}
            · مانده پایان: {{ formatMoneyFa(partyStatement.closingBalance) }}
          </p>
          <DataTable :value="partyStatement.entries" size="small">
            <Column field="dateJalali" header="تاریخ" />
            <Column field="voucherNumber" header="سند" />
            <Column field="description" header="شرح" />
            <Column header="بدهکار">
              <template #body="{ data }">
                {{ formatMoneyFa(data.debit) }}
              </template>
            </Column>
            <Column header="بستانکار">
              <template #body="{ data }">
                {{ formatMoneyFa(data.credit) }}
              </template>
            </Column>
            <Column header="مانده">
              <template #body="{ data }">
                {{ formatMoneyFa(data.balance) }}
              </template>
            </Column>
          </DataTable>
        </div>
      </TabPanel>

      <TabPanel header="مالیات بر ارزش افزوده" value="3">
        <div class="flex flex-wrap gap-3 mb-4 items-end">
          <JalaliDatePicker v-model="fromJalali" label="از تاریخ" />
          <JalaliDatePicker v-model="toJalali" label="تا تاریخ" />
          <Button
            :label="ux.reports.run"
            icon="pi pi-percentage"
            class="min-h-11"
            :loading="loading"
            @click="loadVatReport"
          />
        </div>

        <template v-if="vatReport">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="hy-surface p-4">
              <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.reports.outputVat }}</p>
              <p class="text-lg font-bold text-[var(--hy-success)] m-0 mt-1">
                {{ formatMoneyFa(vatReport.outputVat) }}
              </p>
            </div>
            <div class="hy-surface p-4">
              <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.reports.inputVat }}</p>
              <p class="text-lg font-bold text-[var(--hy-danger)] m-0 mt-1">
                {{ formatMoneyFa(vatReport.inputVat) }}
              </p>
            </div>
            <div class="hy-surface p-4">
              <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.reports.netPayable }}</p>
              <p
                class="text-lg font-bold m-0 mt-1"
                :class="
                  BigInt(vatReport.netPayable) >= 0n
                    ? 'text-[var(--hy-primary)]'
                    : 'text-[var(--hy-success)]'
                "
              >
                {{ formatMoneyFa(vatReport.netPayable) }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="hy-surface p-4">
              <h3 class="font-bold mt-0">{{ ux.reports.salesVat }}</h3>
              <DataTable :value="vatReport.sales" size="small" paginator :rows="10">
                <Column field="dateJalali" header="تاریخ" />
                <Column field="invoiceNumber" header="فاکتور" />
                <Column field="partyName" header="مشتری" />
                <Column header="مبلغ مشمول">
                  <template #body="{ data }">
                    {{ formatMoneyFa(data.taxableAmount) }}
                  </template>
                </Column>
                <Column header="مالیات">
                  <template #body="{ data }">
                    {{ formatMoneyFa(data.vatAmount) }}
                  </template>
                </Column>
              </DataTable>
            </div>
            <div class="hy-surface p-4">
              <h3 class="font-bold mt-0">{{ ux.reports.purchaseVat }}</h3>
              <DataTable :value="vatReport.purchases" size="small" paginator :rows="10">
                <Column field="dateJalali" header="تاریخ" />
                <Column field="invoiceNumber" header="فاکتور" />
                <Column field="partyName" header="تأمین‌کننده" />
                <Column header="مبلغ مشمول">
                  <template #body="{ data }">
                    {{ formatMoneyFa(data.taxableAmount) }}
                  </template>
                </Column>
                <Column header="مالیات">
                  <template #body="{ data }">
                    {{ formatMoneyFa(data.vatAmount) }}
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </template>
      </TabPanel>

      <TabPanel :header="ux.reports.cashFlow" value="4">
        <div class="flex flex-wrap gap-3 mb-4 items-end">
          <JalaliDatePicker v-model="fromJalali" label="از تاریخ" />
          <JalaliDatePicker v-model="toJalali" label="تا تاریخ" />
          <Button :label="ux.reports.run" icon="pi pi-wallet" :loading="loading" @click="loadCashFlow" />
        </div>
        <template v-if="cashFlow">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="hy-surface p-4">
              <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.reports.openingBalance }}</p>
              <p class="text-lg font-bold m-0 mt-1">{{ formatMoneyFa(cashFlow.openingBalance) }}</p>
            </div>
            <div class="hy-surface p-4">
              <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.reports.closingBalance }}</p>
              <p class="text-lg font-bold m-0 mt-1">{{ formatMoneyFa(cashFlow.closingBalance) }}</p>
            </div>
            <div class="hy-surface p-4">
              <p class="text-xs text-[var(--hy-muted)] m-0">{{ ux.reports.netChange }}</p>
              <p class="text-lg font-bold m-0 mt-1">{{ formatMoneyFa(cashFlow.netChange) }}</p>
            </div>
          </div>
          <DataTable :value="cashFlow.rows" size="small" paginator :rows="15">
            <Column field="dateJalali" header="تاریخ" />
            <Column field="kind" header="نوع" />
            <Column field="reference" header="مرجع" />
            <Column field="description" header="شرح" />
            <Column header="ورود">
              <template #body="{ data }">{{ formatMoneyFa(data.inflow) }}</template>
            </Column>
            <Column header="خروج">
              <template #body="{ data }">{{ formatMoneyFa(data.outflow) }}</template>
            </Column>
            <Column header="مانده">
              <template #body="{ data }">{{ formatMoneyFa(data.balance) }}</template>
            </Column>
          </DataTable>
        </template>
      </TabPanel>

      <TabPanel :header="ux.reports.checkReport" value="5">
        <div class="flex flex-wrap gap-3 mb-4 items-end">
          <JalaliDatePicker v-model="fromJalali" label="سررسید از" />
          <JalaliDatePicker v-model="toJalali" label="سررسید تا" />
          <Button :label="ux.reports.run" icon="pi pi-money-bill" :loading="loading" @click="loadCheckReport" />
        </div>
        <template v-if="checkReport">
          <div class="flex flex-wrap gap-2 mb-4">
            <Tag :value="`دریافتنی: ${formatMoneyFa(checkReport.totalReceivable)}`" severity="success" />
            <Tag :value="`پرداختنی: ${formatMoneyFa(checkReport.totalPayable)}`" severity="warn" />
            <Tag :value="`سررسید هفته: ${checkReport.dueThisWeek}`" severity="info" />
            <Tag v-if="checkReport.overdue > 0" :value="`معوق: ${checkReport.overdue}`" severity="danger" />
          </div>
          <DataTable :value="checkReport.rows" size="small" paginator :rows="15">
            <Column field="sayyadNumber" header="صیاد" />
            <Column field="partyName" header="طرف‌حساب" />
            <Column field="dueJalali" header="سررسید" />
            <Column field="status" header="وضعیت" />
            <Column header="مبلغ">
              <template #body="{ data }">{{ formatMoneyFa(data.amount) }}</template>
            </Column>
          </DataTable>
        </template>
      </TabPanel>

      <TabPanel :header="ux.reports.inventoryKardex" value="6">
        <div class="flex flex-wrap gap-3 mb-4 items-end">
          <div class="flex flex-col gap-1 min-w-[12rem]">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.reports.selectProduct }}</label>
            <Select v-model="productId" :options="products" option-label="name" option-value="id" filter class="w-full" />
          </div>
          <JalaliDatePicker v-model="fromJalali" label="از" />
          <JalaliDatePicker v-model="toJalali" label="تا" />
          <Button :label="ux.reports.run" icon="pi pi-box" :loading="loading" @click="loadKardex" />
        </div>
        <div v-if="kardex" class="hy-surface p-4">
          <p class="text-sm text-[var(--hy-muted)]">
            {{ kardex.productName }} ({{ kardex.sku }}) —
            موجودی ابتدا: {{ kardex.openingQty }} · پایان: {{ kardex.closingQty }}
          </p>
          <DataTable :value="kardex.entries" size="small">
            <Column field="dateJalali" header="تاریخ" />
            <Column field="kind" header="نوع" />
            <Column field="reference" header="مرجع" />
            <Column field="quantityIn" header="ورود" />
            <Column field="quantityOut" header="خروج" />
            <Column field="balanceQty" header="مانده" />
          </DataTable>
        </div>
      </TabPanel>

      <TabPanel :header="ux.reports.ownerStatus" value="7">
        <div class="flex flex-wrap gap-3 mb-4 items-end">
          <JalaliDatePicker v-model="fromJalali" label="از" />
          <JalaliDatePicker v-model="toJalali" label="تا" />
          <Button :label="ux.reports.run" icon="pi pi-user" :loading="loading" @click="loadOwnerStatus" />
        </div>
        <div v-if="ownerStatus" class="hy-surface p-4">
          <p class="font-semibold mb-3">جمع برداشت: {{ formatMoneyFa(ownerStatus.grandTotal) }}</p>
          <DataTable :value="ownerStatus.rows" size="small">
            <Column field="ownerName" header="مالک" />
            <Column field="drawingCount" header="تعداد" />
            <Column header="جمع برداشت">
              <template #body="{ data }">{{ formatMoneyFa(data.totalDrawings) }}</template>
            </Column>
          </DataTable>
        </div>
      </TabPanel>

      <TabPanel :header="ux.reports.partnerBalances" value="8">
        <div class="flex flex-wrap gap-3 mb-4 items-end">
          <JalaliDatePicker v-model="fromJalali" label="از" />
          <JalaliDatePicker v-model="toJalali" label="تا" />
          <Button :label="ux.reports.run" icon="pi pi-share-alt" :loading="loading" @click="loadPartnerBalances" />
        </div>
        <div v-if="partnerBalances" class="hy-surface p-4">
          <p class="text-sm text-[var(--hy-muted)] mb-3">
            دارایی {{ formatMoneyFa(partnerBalances.totalAssets) }} ·
            بدهی {{ formatMoneyFa(partnerBalances.totalLiabilities) }} ·
            خالص {{ formatMoneyFa(partnerBalances.netEquity) }}
          </p>
          <DataTable :value="partnerBalances.rows" size="small">
            <Column field="partnerName" header="شریک" />
            <Column header="سهم">
              <template #body="{ data }">{{ data.sharePercent }}٪</template>
            </Column>
            <Column header="سهم equity">
              <template #body="{ data }">{{ formatMoneyFa(data.equityShare) }}</template>
            </Column>
            <Column header="سهم سود">
              <template #body="{ data }">{{ formatMoneyFa(data.profitShare) }}</template>
            </Column>
            <Column header="برداشت">
              <template #body="{ data }">{{ formatMoneyFa(data.drawings) }}</template>
            </Column>
            <Column header="مانده">
              <template #body="{ data }">{{ formatMoneyFa(data.netBalance) }}</template>
            </Column>
          </DataTable>
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>
