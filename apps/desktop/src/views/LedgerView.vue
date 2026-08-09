<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type { Account, LedgerReport } from "@hesabyar/shared";
import { fetchAccounts, fetchLedger } from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { exportLedgerExcel, exportLedgerPdf } from "@/lib/ledger-export";
import PageHeader from "@/components/PageHeader.vue";
import MobileListCard from "@/components/MobileListCard.vue";
import { usePageCopy } from "@/composables/usePageCopy";

const toast = useToast();
const { copy: pageCopy, isMobile } = usePageCopy("ledger");
const accounts = ref<Account[]>([]);
const accountId = ref<string | null>(null);
const fromJalali = ref("");
const toJalali = ref("");
const loading = ref(false);
const report = ref<LedgerReport | null>(null);

const accountOptions = computed(() =>
  accounts.value
    .filter((a) => a.level === "DETAIL")
    .map((a) => ({ label: `${a.code} — ${a.name}`, value: a.id })),
);

onMounted(async () => {
  try {
    accounts.value = await fetchAccounts();
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری حساب‌ها ناموفق بود",
      life: 4000,
    });
  }
});

async function load(): Promise<void> {
  if (!accountId.value) {
    toast.add({
      severity: "warn",
      summary: "توجه",
      detail: "حساب را انتخاب کنید",
      life: 2500,
    });
    return;
  }
  loading.value = true;
  try {
    report.value = await fetchLedger({
      accountId: accountId.value,
      fromJalali: fromJalali.value || undefined,
      toJalali: toJalali.value || undefined,
    });
  } catch (error: unknown) {
    const detail =
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? "بارگذاری دفتر کل ناموفق بود";
    toast.add({ severity: "error", summary: "خطا", detail, life: 4000 });
  } finally {
    loading.value = false;
  }
}

function onExcel(): void {
  if (!report.value) return;
  exportLedgerExcel(report.value);
}

function onPdf(): void {
  if (!report.value) return;
  exportLedgerPdf(report.value);
}
</script>

<template>
  <div :class="isMobile ? 'hy-page-mobile space-y-4 p-4' : 'p-6 space-y-4'" dir="rtl">
    <Toast />

    <PageHeader
      :title="pageCopy.title"
      :subtitle="pageCopy.subtitle"
      :hint="pageCopy.hint"
    >
      <template #actions>
        <div class="flex gap-2">
          <Button
            label="Excel"
            icon="pi pi-file-excel"
            severity="success"
            outlined
            class="min-h-11"
            :disabled="!report"
            @click="onExcel"
          />
          <Button
            label="PDF"
            icon="pi pi-print"
            severity="secondary"
            outlined
            class="min-h-11"
            :disabled="!report"
            @click="onPdf"
          />
        </div>
      </template>
    </PageHeader>

    <div class="grid md:grid-cols-4 gap-3 items-end">
      <div class="flex flex-col gap-2 md:col-span-2">
        <label class="text-sm text-slate-600">حساب</label>
        <Select
          v-model="accountId"
          :options="accountOptions"
          option-label="label"
          option-value="value"
          filter
          placeholder="انتخاب حساب تفصیلی"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-2">
        <label class="text-sm text-slate-600">از تاریخ</label>
        <InputText v-latin-digits v-model="fromJalali" placeholder="1403/01/01" class="w-full" />
      </div>
      <div class="flex flex-col gap-2">
        <label class="text-sm text-slate-600">تا تاریخ</label>
        <InputText v-latin-digits v-model="toJalali" placeholder="1403/12/29" class="w-full" />
      </div>
    </div>

    <Button label="نمایش" icon="pi pi-search" :loading="loading" @click="load" />

    <div
      v-if="!report && !loading"
      class="flex flex-col items-center justify-center gap-3 py-16 text-slate-500"
    >
      <i class="pi pi-list text-5xl text-slate-300" />
      <p>حساب و بازه را انتخاب کنید</p>
    </div>

    <template v-if="report">
      <div class="flex flex-wrap gap-4 text-sm text-slate-700">
        <span>مانده اول: {{ formatMoneyFa(report.openingBalance) }}</span>
        <span>جمع بدهکار: {{ formatMoneyFa(report.totalDebit) }}</span>
        <span>جمع بستانکار: {{ formatMoneyFa(report.totalCredit) }}</span>
        <span class="font-bold">مانده پایان: {{ formatMoneyFa(report.closingBalance) }}</span>
      </div>

      <ul
        v-if="isMobile"
        class="list-none m-0 p-0 space-y-2"
      >
        <li v-for="(row, i) in report.entries" :key="i">
          <MobileListCard
            :title="row.description || `سند ${row.voucherNumber}`"
            :subtitle="`${row.dateJalali} · ${row.voucherNumber}`"
            :meta="formatMoneyFa(row.balance)"
            meta-severity="info"
          />
        </li>
      </ul>

      <DataTable
        v-else
        :value="report.entries"
        :loading="loading"
        paginator
        :rows="20"
        class="text-sm"
      >
        <Column field="dateJalali" header="تاریخ" />
        <Column field="voucherNumber" header="شماره سند" />
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
    </template>
  </div>
</template>
