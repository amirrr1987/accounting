<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type {
  BankAccount,
  Check,
  CheckKind,
  CheckStatus,
  CheckSummary,
} from "@hesabyar/shared";
import {
  CHECK_KIND_LABELS,
  CHECK_STATUS_LABELS,
  CHECK_STATUS_TRANSITIONS,
  todayJalali,
} from "@hesabyar/shared";
import {
  fetchBankAccounts,
  fetchCheckSummary,
  fetchChecks,
  updateCheckStatus,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import { formatMoneyFa } from "@/lib/money";

const router = useRouter();
const toast = useToast();

const checks = ref<Check[]>([]);
const summary = ref<CheckSummary | null>(null);
const bankAccounts = ref<BankAccount[]>([]);
const loading = ref(false);
const statusFilter = ref<CheckStatus | null>(null);
const kindFilter = ref<CheckKind | null>(null);

const statusDialog = ref(false);
const savingStatus = ref(false);
const selected = ref<Check | null>(null);
const statusForm = reactive({
  status: null as CheckStatus | null,
  dateJalali: todayJalali(),
  note: "",
  bankAccountId: null as string | null,
});

const statusFilterOptions = [
  { label: "همه", value: null },
  ...Object.entries(CHECK_STATUS_LABELS).map(([value, label]) => ({
    label,
    value: value as CheckStatus,
  })),
];

const kindFilterOptions = [
  { label: "همه", value: null },
  ...Object.entries(CHECK_KIND_LABELS).map(([value, label]) => ({
    label,
    value: value as CheckKind,
  })),
];

const nextStatusOptions = computed(() => {
  if (!selected.value) return [];
  const allowed =
    CHECK_STATUS_TRANSITIONS[selected.value.kind][selected.value.status] ?? [];
  return allowed.map((value) => ({
    value,
    label: CHECK_STATUS_LABELS[value],
  }));
});

const needsBank = computed(
  () =>
    statusForm.status === "DEPOSITED" ||
    statusForm.status === "CLEARED" ||
    statusForm.status === "PAID",
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [list, sum, banks] = await Promise.all([
      fetchChecks({
        status: statusFilter.value ?? undefined,
        kind: kindFilter.value ?? undefined,
      }),
      fetchCheckSummary(),
      fetchBankAccounts(),
    ]);
    checks.value = list;
    summary.value = sum;
    bankAccounts.value = banks.filter((b) => b.isActive);
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری چک‌ها ناموفق بود",
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function openStatus(row: Check): void {
  selected.value = row;
  statusForm.status = null;
  statusForm.dateJalali = todayJalali();
  statusForm.note = "";
  statusForm.bankAccountId = row.bankAccountId;
  statusDialog.value = true;
}

async function saveStatus(): Promise<void> {
  if (!selected.value || !statusForm.status) return;
  savingStatus.value = true;
  try {
    await updateCheckStatus(selected.value.id, {
      status: statusForm.status,
      dateJalali: statusForm.dateJalali,
      note: statusForm.note || undefined,
      bankAccountId: needsBank.value
        ? statusForm.bankAccountId ?? undefined
        : undefined,
    });
    toast.add({
      severity: "success",
      summary: "وضعیت به‌روز شد",
      life: 3500,
    });
    statusDialog.value = false;
    await load();
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "تغییر وضعیت ناموفق بود",
      life: 4000,
    });
  } finally {
    savingStatus.value = false;
  }
}

function severityForStatus(status: CheckStatus): "success" | "warn" | "danger" | "info" | "secondary" {
  if (status === "CLEARED" || status === "PAID") return "success";
  if (status === "RETURNED") return "danger";
  if (status === "DEPOSITED") return "info";
  return "secondary";
}
</script>

<template>
  <div class="hy-page" dir="rtl">
    <Toast />
    <PageHeader
      title="چک‌های صیادی"
      subtitle="مدیریت چرخه عمر چک با شماره صیاد، سررسید و وضعیت"
    >
      <template #actions>
        <Button
          label="ثبت چک جدید"
          icon="pi pi-plus"
          class="min-h-11"
          @click="router.push('/checks/new')"
        />
      </template>
    </PageHeader>

    <div
      v-if="summary"
      class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
    >
      <div class="hy-surface p-3">
        <div class="text-sm text-[var(--hy-muted)]">کل چک‌ها</div>
        <div class="text-xl font-bold">{{ summary.total }}</div>
      </div>
      <div class="hy-surface p-3">
        <div class="text-sm text-[var(--hy-muted)]">سررسید این هفته</div>
        <div class="text-xl font-bold text-amber-600">{{ summary.dueThisWeek }}</div>
      </div>
      <div class="hy-surface p-3">
        <div class="text-sm text-[var(--hy-muted)]">سررسید گذشته</div>
        <div class="text-xl font-bold text-red-600">{{ summary.overdue }}</div>
      </div>
      <div class="hy-surface p-3">
        <div class="text-sm text-[var(--hy-muted)]">نزد صندوق</div>
        <div class="text-xl font-bold">{{ summary.byStatus.IN_PORTFOLIO }}</div>
      </div>
    </div>

    <div class="hy-surface p-3 mb-4 flex flex-wrap gap-3">
      <Select
        v-model="statusFilter"
        :options="statusFilterOptions"
        option-label="label"
        option-value="value"
        placeholder="وضعیت"
        class="w-44"
        @change="load"
      />
      <Select
        v-model="kindFilter"
        :options="kindFilterOptions"
        option-label="label"
        option-value="value"
        placeholder="نوع"
        class="w-44"
        @change="load"
      />
      <Button label="بروزرسانی" icon="pi pi-refresh" text @click="load" />
    </div>

    <div class="hy-surface overflow-hidden">
      <DataTable
        :value="checks"
        :loading="loading"
        striped-rows
        paginator
        :rows="15"
        empty-message=" "
      >
        <template #empty>
          <EmptyState
            icon="pi pi-money-bill"
            title="چکی ثبت نشده"
            description="چک دریافتی یا پرداختی با شماره صیاد ثبت کنید"
          />
        </template>
        <Column field="sayyadNumber" header="صیاد" />
        <Column header="نوع">
          <template #body="{ data }">
            {{ CHECK_KIND_LABELS[data.kind as CheckKind] }}
          </template>
        </Column>
        <Column field="partyName" header="طرف‌حساب" />
        <Column field="dueJalali" header="سررسید" />
        <Column header="مبلغ">
          <template #body="{ data }">
            {{ formatMoneyFa(data.amount) }}
          </template>
        </Column>
        <Column header="وضعیت">
          <template #body="{ data }">
            <Tag
              :value="CHECK_STATUS_LABELS[data.status as CheckStatus]"
              :severity="severityForStatus(data.status)"
            />
          </template>
        </Column>
        <Column header="">
          <template #body="{ data }">
            <Button
              icon="pi pi-sync"
              text
              rounded
              aria-label="تغییر وضعیت"
              @click="openStatus(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="statusDialog"
      modal
      header="تغییر وضعیت چک"
      class="w-full max-w-md"
    >
      <div class="flex flex-col gap-3 pt-2">
        <div v-if="selected" class="text-sm text-[var(--hy-muted)]">
          صیاد {{ selected.sayyadNumber }} — {{ formatMoneyFa(selected.amount) }}
        </div>
        <Select
          v-model="statusForm.status"
          :options="nextStatusOptions"
          option-label="label"
          option-value="value"
          placeholder="وضعیت جدید"
          class="w-full"
        />
        <JalaliDatePicker v-model="statusForm.dateJalali" />
        <Select
          v-if="needsBank"
          v-model="statusForm.bankAccountId"
          :options="bankAccounts"
          :option-label="(b: BankAccount) => `${b.bankName} — ${b.name}`"
          option-value="id"
          placeholder="حساب بانکی"
          class="w-full"
        />
        <InputText v-model="statusForm.note" placeholder="یادداشت (اختیاری)" />
      </div>
      <template #footer>
        <Button label="انصراف" text @click="statusDialog = false" />
        <Button
          label="ثبت"
          :loading="savingStatus"
          :disabled="!statusForm.status"
          @click="saveStatus"
        />
      </template>
    </Dialog>
  </div>
</template>
