<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "primevue/button";
import TreeTable from "primevue/treetable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import { todayJalali, type TrialBalanceReport } from "@hesabyar/shared";
import { fetchTrialBalance } from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { printTrialBalance } from "@/lib/trial-balance-print";
import { exportTrialBalanceExcel } from "@/lib/trial-balance-export";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import { ux } from "@/locale/ux-copy";

const toast = useToast();
const asOfJalali = ref(todayJalali());
const loading = ref(false);
const report = ref<TrialBalanceReport | null>(null);

const equationSeverity = computed(() =>
  report.value?.isBalanced ? ("success" as const) : ("danger" as const),
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    report.value = await fetchTrialBalance({ asOfJalali: asOfJalali.value });
  } catch (error: unknown) {
    const detail =
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? ux.trialBalance.loadError;
    toast.add({ severity: "error", summary: "خطا", detail, life: 4000 });
  } finally {
    loading.value = false;
  }
}

function onExportExcel(): void {
  if (!report.value) return;
  exportTrialBalanceExcel(report.value);
}

function onPrint(): void {
  if (!report.value) return;
  printTrialBalance(report.value);
}
</script>

<template>
  <div class="p-6 space-y-4" dir="rtl">
    <Toast />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">{{ ux.trialBalance.title }}</h1>
        <p class="text-slate-600 text-sm mt-1">
          {{ ux.trialBalance.subtitle }} — سطوح گروه / کل / معین
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          :label="ux.trialBalance.exportExcel"
          icon="pi pi-file-excel"
          outlined
          :disabled="!report"
          @click="onExportExcel"
        />
        <Button
          label="چاپ / PDF"
          icon="pi pi-print"
          outlined
          :disabled="!report"
          @click="onPrint"
        />
      </div>
    </div>

    <div class="flex flex-wrap gap-3 items-end">
      <JalaliDatePicker v-model="asOfJalali" :label="ux.trialBalance.asOf" />
      <Button
        :label="ux.trialBalance.run"
        icon="pi pi-calculator"
        :loading="loading"
        @click="load"
      />
    </div>

    <div v-if="report" class="flex flex-wrap items-center gap-3">
      <Tag
        :value="report.isBalanced ? ux.trialBalance.balanced : ux.trialBalance.unbalanced"
        :severity="equationSeverity"
        rounded
        class="text-base px-3 py-2"
      />
      <span class="text-sm" :class="report.isBalanced ? 'text-slate-700' : 'text-red-700 font-bold'">
        جمع بدهکار: {{ formatMoneyFa(report.totalDebit) }} —
        جمع بستانکار: {{ formatMoneyFa(report.totalCredit) }}
      </span>
    </div>

    <div
      v-if="!report && !loading"
      class="flex flex-col items-center justify-center gap-3 py-16 text-slate-500"
    >
      <i class="pi pi-chart-bar text-5xl text-slate-300" />
      <p>{{ ux.trialBalance.emptyHint }}</p>
    </div>

    <TreeTable
      v-if="report"
      :value="report.tree"
      :loading="loading"
      class="text-sm"
      :row-class="() => (report && !report.isBalanced ? 'bg-red-50' : '')"
    >
      <Column field="code" header="کد" expander style="width: 10rem">
        <template #body="{ node }">
          <span class="font-mono">{{ node.data.code }}</span>
        </template>
      </Column>
      <Column field="name" header="نام حساب">
        <template #body="{ node }">
          {{ node.data.name }}
        </template>
      </Column>
      <Column header="سطح" style="width: 6rem">
        <template #body="{ node }">
          {{ node.data.level }}
        </template>
      </Column>
      <Column header="بدهکار" style="width: 9rem">
        <template #body="{ node }">
          {{ formatMoneyFa(node.data.debit) }}
        </template>
      </Column>
      <Column header="بستانکار" style="width: 9rem">
        <template #body="{ node }">
          {{ formatMoneyFa(node.data.credit) }}
        </template>
      </Column>
    </TreeTable>
  </div>
</template>
