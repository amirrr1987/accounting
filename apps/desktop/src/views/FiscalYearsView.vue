<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type { FiscalYear } from "@hesabyar/shared";
import { todayJalali } from "@hesabyar/shared";
import {
  closeFiscalYear,
  fetchFiscalYears,
  reopenFiscalYear,
} from "@/lib/api";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import PageHeader from "@/components/PageHeader.vue";
import { ux } from "@/locale/ux-copy";

const toast = useToast();
const years = ref<FiscalYear[]>([]);
const loading = ref(false);
const closeThrough = ref(todayJalali());

async function load(): Promise<void> {
  loading.value = true;
  try {
    years.value = await fetchFiscalYears();
  } catch {
    toast.add({ severity: "error", summary: ux.fiscal.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

async function closePeriod(row: FiscalYear): Promise<void> {
  try {
    await closeFiscalYear(row.id, { throughJalali: closeThrough.value, closeYear: false });
    toast.add({ severity: "success", summary: ux.fiscal.closedOk, life: 3000 });
    await load();
  } catch {
    toast.add({ severity: "error", summary: ux.fiscal.error, life: 4000 });
  }
}

async function closeYear(row: FiscalYear): Promise<void> {
  try {
    await closeFiscalYear(row.id, { closeYear: true });
    toast.add({ severity: "success", summary: ux.fiscal.yearClosedOk, life: 3000 });
    await load();
  } catch {
    toast.add({ severity: "error", summary: ux.fiscal.error, life: 4000 });
  }
}

async function reopen(row: FiscalYear): Promise<void> {
  try {
    await reopenFiscalYear(row.id);
    toast.add({ severity: "success", summary: ux.fiscal.reopenedOk, life: 3000 });
    await load();
  } catch {
    toast.add({ severity: "error", summary: ux.fiscal.error, life: 4000 });
  }
}
</script>

<template>
  <div class="hy-page" dir="rtl">
    <Toast />
    <PageHeader :title="ux.fiscal.title" :subtitle="ux.fiscal.subtitle" />

    <div class="hy-surface p-4 mb-4 flex flex-wrap gap-3 items-end">
      <JalaliDatePicker v-model="closeThrough" :label="ux.fiscal.closeThrough" />
      <p class="text-xs text-[var(--hy-muted)] m-0 max-w-md">
        {{ ux.fiscal.closeHint }}
      </p>
    </div>

    <div class="hy-surface overflow-hidden">
      <DataTable :value="years" :loading="loading" class="text-sm">
        <Column field="title" header="سال" />
        <Column field="startJalali" header="شروع" />
        <Column field="endJalali" header="پایان" />
        <Column header="قفل تا">
          <template #body="{ data }">
            {{ data.closedThroughJalali ?? "—" }}
          </template>
        </Column>
        <Column header="وضعیت">
          <template #body="{ data }">
            <Tag
              :value="data.isClosed ? ux.fiscal.closed : data.isActive ? ux.fiscal.active : ux.common.inactive"
              :severity="data.isClosed ? 'danger' : data.isActive ? 'success' : 'secondary'"
            />
          </template>
        </Column>
        <Column header="عملیات">
          <template #body="{ data }">
            <Button
              v-if="!data.isClosed"
              :label="ux.fiscal.closePeriod"
              text
              size="small"
              @click="closePeriod(data)"
            />
            <Button
              v-if="!data.isClosed"
              :label="ux.fiscal.closeYear"
              text
              size="small"
              severity="danger"
              @click="closeYear(data)"
            />
            <Button
              v-if="data.isClosed || data.closedThroughJalali"
              :label="ux.fiscal.reopen"
              text
              size="small"
              @click="reopen(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
