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
import MobileListCard from "@/components/MobileListCard.vue";
import { usePageCopy } from "@/composables/usePageCopy";
import { ux } from "@/locale/ux-copy";

const toast = useToast();
const { copy: pageCopy, isMobile } = usePageCopy("fiscal");
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
  <div :class="isMobile ? 'hy-page-mobile space-y-4' : 'hy-page'" dir="rtl">
    <Toast />
    <PageHeader
      :title="pageCopy.title"
      :subtitle="pageCopy.subtitle"
      :hint="pageCopy.hint"
    />

    <div class="hy-surface p-4 mb-4 flex flex-wrap gap-3 items-end">
      <JalaliDatePicker v-model="closeThrough" :label="ux.fiscal.closeThrough" />
      <p class="text-xs text-[var(--hy-muted)] m-0 max-w-md">
        {{ ux.fiscal.closeHint }}
      </p>
    </div>

    <div class="hy-surface overflow-hidden">
      <ul
        v-if="isMobile"
        class="list-none m-0 p-0 divide-y divide-[var(--hy-border)]"
      >
        <li v-for="row in years" :key="row.id" class="p-4 space-y-3">
          <MobileListCard
            :title="row.title"
            :subtitle="`${row.startJalali} — ${row.endJalali}`"
            :meta="row.isClosed ? ux.fiscal.closed : row.isActive ? ux.fiscal.active : ux.common.inactive"
            :meta-severity="row.isClosed ? 'danger' : row.isActive ? 'success' : 'secondary'"
          />
          <p v-if="row.closedThroughJalali" class="text-xs text-[var(--hy-muted)] m-0">
            قفل تا: {{ row.closedThroughJalali }}
          </p>
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="!row.isClosed"
              :label="ux.fiscal.closePeriod"
              size="small"
              outlined
              class="min-h-10"
              @click="closePeriod(row)"
            />
            <Button
              v-if="!row.isClosed"
              :label="ux.fiscal.closeYear"
              size="small"
              severity="danger"
              outlined
              class="min-h-10"
              @click="closeYear(row)"
            />
            <Button
              v-if="row.isClosed || row.closedThroughJalali"
              :label="ux.fiscal.reopen"
              size="small"
              text
              class="min-h-10"
              @click="reopen(row)"
            />
          </div>
        </li>
      </ul>

      <DataTable v-else :value="years" :loading="loading" class="text-sm">
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
