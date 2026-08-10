<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type { FiscalYear } from "@hesabyar/shared";
import {
  currentJalaliYear,
  endOfJalaliYear,
  todayJalali,
} from "@hesabyar/shared";
import {
  activateFiscalYear,
  closeFiscalYear,
  createFiscalYear,
  fetchFiscalYears,
  reopenFiscalYear,
} from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
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

const currentYearTitle = currentJalaliYear();
const hasCurrentYear = computed(() =>
  years.value.some((y) => y.title === currentYearTitle),
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    years.value = await fetchFiscalYears();
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.fiscal.loadError,
      detail: apiErrorMessage(err, ux.fiscal.loadError),
      life: 6000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

async function ensureCurrentYear(): Promise<void> {
  try {
    const created = await createFiscalYear({
      title: currentYearTitle,
      startJalali: `${currentYearTitle}/01/01`,
      endJalali: endOfJalaliYear(currentYearTitle),
    });
    await activateFiscalYear(created.id);
    toast.add({
      severity: "success",
      summary: ux.fiscal.createOk,
      detail: ux.fiscal.activateOk,
      life: 3500,
    });
    await load();
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.fiscal.error,
      detail: apiErrorMessage(err, ux.fiscal.error),
      life: 6000,
    });
  }
}

async function activate(row: FiscalYear): Promise<void> {
  try {
    await activateFiscalYear(row.id);
    toast.add({ severity: "success", summary: ux.fiscal.activateOk, life: 3000 });
    await load();
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.fiscal.error,
      detail: apiErrorMessage(err, ux.fiscal.error),
      life: 6000,
    });
  }
}

async function closePeriod(row: FiscalYear): Promise<void> {
  try {
    await closeFiscalYear(row.id, {
      throughJalali: closeThrough.value,
      closeYear: false,
    });
    toast.add({ severity: "success", summary: ux.fiscal.closedOk, life: 3000 });
    await load();
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.fiscal.error,
      detail: apiErrorMessage(err, ux.fiscal.error),
      life: 6000,
    });
  }
}

async function closeYear(row: FiscalYear): Promise<void> {
  try {
    await closeFiscalYear(row.id, { closeYear: true });
    toast.add({
      severity: "success",
      summary: ux.fiscal.yearClosedOk,
      life: 3000,
    });
    await load();
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.fiscal.error,
      detail: apiErrorMessage(err, ux.fiscal.error),
      life: 6000,
    });
  }
}

async function reopen(row: FiscalYear): Promise<void> {
  try {
    await reopenFiscalYear(row.id);
    toast.add({ severity: "success", summary: ux.fiscal.reopenedOk, life: 3000 });
    await load();
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.fiscal.error,
      detail: apiErrorMessage(err, ux.fiscal.error),
      life: 6000,
    });
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
    >
      <template #actions>
        <Button
          v-if="!hasCurrentYear"
          :label="ux.fiscal.createCurrent"
          icon="pi pi-plus"
          class="min-h-10"
          @click="ensureCurrentYear"
        />
      </template>
    </PageHeader>

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
            :meta="
              row.isClosed
                ? ux.fiscal.closed
                : row.isActive
                  ? ux.fiscal.active
                  : ux.common.inactive
            "
            :meta-severity="
              row.isClosed ? 'danger' : row.isActive ? 'success' : 'secondary'
            "
          />
          <p
            v-if="row.closedThroughJalali"
            class="text-xs text-[var(--hy-muted)] m-0"
          >
            قفل تا: {{ row.closedThroughJalali }}
          </p>
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="!row.isActive && !row.isClosed"
              :label="ux.fiscal.activate"
              size="small"
              class="min-h-10"
              @click="activate(row)"
            />
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
              :value="
                data.isClosed
                  ? ux.fiscal.closed
                  : data.isActive
                    ? ux.fiscal.active
                    : ux.common.inactive
              "
              :severity="
                data.isClosed
                  ? 'danger'
                  : data.isActive
                    ? 'success'
                    : 'secondary'
              "
            />
          </template>
        </Column>
        <Column header="عملیات">
          <template #body="{ data }">
            <Button
              v-if="!data.isActive && !data.isClosed"
              :label="ux.fiscal.activate"
              text
              size="small"
              @click="activate(data)"
            />
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
