<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type {
  Account,
  BankAccount,
  CreatePartnerDrawingInput,
  CreatePartnerInput,
  Partner,
  PartnerBalanceReport,
  PartnerDrawing,
} from "@hesabyar/shared";
import {
  EXPENSE_PAY_FROM_LABELS,
  todayJalali,
} from "@hesabyar/shared";
import {
  createPartner,
  createPartnerDrawing,
  deactivatePartner,
  fetchAccounts,
  fetchBankAccounts,
  fetchPartnerBalances,
  fetchPartnerDrawings,
  fetchPartners,
  updatePartner,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import HyDoughnutChart from "@/components/charts/HyDoughnutChart.vue";
import { formatMoneyFa, parseMoneyInput } from "@/lib/money";
import { CHART_COLORS } from "@/lib/chart-theme";
import { ux } from "@/locale/ux-copy";

const toast = useToast();
const partners = ref<Partner[]>([]);
const balances = ref<PartnerBalanceReport | null>(null);
const drawings = ref<PartnerDrawing[]>([]);
const cashAccounts = ref<Account[]>([]);
const bankAccounts = ref<BankAccount[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const drawingDialog = ref(false);
const editing = ref<Partner | null>(null);

const balanceFrom = ref(`${todayJalali().split("/")[0]}/01/01`);
const balanceTo = ref(todayJalali());

const form = reactive({
  name: "",
  mobile: "",
  nationalId: "",
  sharePercent: null as number | null,
});

const drawingForm = reactive({
  partnerId: null as string | null,
  dateJalali: todayJalali(),
  amount: null as number | null,
  description: "",
  payFrom: "CASH" as "CASH" | "BANK",
  cashAccountId: null as string | null,
  bankAccountId: null as string | null,
});

const payFromOptions = Object.entries(EXPENSE_PAY_FROM_LABELS).map(
  ([value, label]) => ({ value: value as "CASH" | "BANK", label }),
);

const shareTotal = computed(() =>
  partners.value
    .filter((p) => p.isActive)
    .reduce((s, p) => s + p.sharePercent, 0),
);

const ownershipChart = computed(() => {
  if (!balances.value || balances.value.rows.length === 0) return null;
  const colors = [
    CHART_COLORS.primary,
    CHART_COLORS.accent,
    CHART_COLORS.income,
    CHART_COLORS.expense,
    CHART_COLORS.equity,
  ];
  return {
    labels: balances.value.rows.map((r) => `${r.partnerName} (${r.sharePercent}٪)`),
    data: balances.value.rows.map((r) => Number(r.equityShare)),
    colors: balances.value.rows.map((_, i) => colors[i % colors.length] ?? CHART_COLORS.muted),
  };
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [pts, drw, accts, banks] = await Promise.all([
      fetchPartners(),
      fetchPartnerDrawings(),
      fetchAccounts(),
      fetchBankAccounts(),
    ]);
    partners.value = pts;
    drawings.value = drw;
    cashAccounts.value = accts.filter(
      (a) => a.code === "11101" && a.isActive && a.level === "DETAIL",
    );
    bankAccounts.value = banks.filter((b) => b.isActive);
    if (cashAccounts.value[0]) {
      drawingForm.cashAccountId = cashAccounts.value[0].id;
    }
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری شرکا ناموفق بود",
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
}

async function loadBalances(): Promise<void> {
  try {
    balances.value = await fetchPartnerBalances(
      balanceFrom.value,
      balanceTo.value,
    );
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری مانده شرکا ناموفق بود",
      life: 4000,
    });
  }
}

onMounted(() => {
  void load();
  void loadBalances();
});

function openCreate(): void {
  editing.value = null;
  form.name = "";
  form.mobile = "";
  form.nationalId = "";
  form.sharePercent = null;
  dialogVisible.value = true;
}

function openEdit(row: Partner): void {
  editing.value = row;
  form.name = row.name;
  form.mobile = row.mobile ?? "";
  form.nationalId = row.nationalId ?? "";
  form.sharePercent = row.sharePercent;
  dialogVisible.value = true;
}

function openDrawingDialog(): void {
  drawingForm.partnerId = partners.value.find((p) => p.isActive)?.id ?? null;
  drawingForm.dateJalali = todayJalali();
  drawingForm.amount = null;
  drawingForm.description = "";
  drawingForm.payFrom = "CASH";
  drawingForm.bankAccountId = null;
  drawingDialog.value = true;
}

async function save(): Promise<void> {
  if (!form.name.trim() || form.sharePercent == null) return;
  saving.value = true;
  try {
    if (editing.value) {
      await updatePartner(editing.value.id, {
        name: form.name.trim(),
        mobile: form.mobile.trim() || null,
        nationalId: form.nationalId.trim() || null,
        sharePercent: form.sharePercent,
      });
    } else {
      const payload: CreatePartnerInput = {
        name: form.name.trim(),
        mobile: form.mobile.trim() || null,
        nationalId: form.nationalId.trim() || null,
        sharePercent: form.sharePercent,
      };
      await createPartner(payload);
    }
    dialogVisible.value = false;
    await load();
    await loadBalances();
    toast.add({ severity: "success", summary: "ثبت شد", life: 3000 });
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "ثبت شریک ناموفق بود",
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}

async function deactivate(row: Partner): Promise<void> {
  try {
    await deactivatePartner(row.id);
    await load();
    await loadBalances();
    toast.add({ severity: "success", summary: "غیرفعال شد", life: 3000 });
  } catch {
    toast.add({ severity: "error", summary: "خطا", detail: "عملیات ناموفق", life: 4000 });
  }
}

async function saveDrawing(): Promise<void> {
  if (!drawingForm.partnerId || drawingForm.amount == null) return;
  saving.value = true;
  try {
    const payload: CreatePartnerDrawingInput = {
      partnerId: drawingForm.partnerId,
      dateJalali: drawingForm.dateJalali,
      amount: parseMoneyInput(drawingForm.amount),
      description: drawingForm.description,
      payFrom: drawingForm.payFrom,
      cashAccountId:
        drawingForm.payFrom === "CASH"
          ? (drawingForm.cashAccountId ?? undefined)
          : undefined,
      bankAccountId:
        drawingForm.payFrom === "BANK"
          ? (drawingForm.bankAccountId ?? undefined)
          : undefined,
    };
    await createPartnerDrawing(payload);
    drawingDialog.value = false;
    drawings.value = await fetchPartnerDrawings();
    await loadBalances();
    toast.add({ severity: "success", summary: "برداشت ثبت شد", life: 3000 });
  } catch {
    toast.add({ severity: "error", summary: "خطا", detail: "ثبت برداشت ناموفق", life: 4000 });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Toast />
  <div class="hy-page flex flex-col gap-4 p-4 md:p-6" dir="rtl">
    <PageHeader
      :title="ux.nav.partners"
      subtitle="تعریف شرکا، سهم مالکیت و تفکیک موجودی"
    />

    <div class="flex flex-wrap items-center gap-2">
      <Tag
        :value="`مجموع سهم: ${shareTotal.toFixed(1)}٪`"
        :severity="Math.abs(shareTotal - 100) < 0.01 ? 'success' : 'warn'"
      />
      <Button label="شریک جدید" icon="pi pi-plus" @click="openCreate" />
      <Button
        label="برداشت شریک"
        icon="pi pi-wallet"
        severity="secondary"
        outlined
        @click="openDrawingDialog"
      />
    </div>

    <TabView>
      <TabPanel header="فهرست شرکا">
        <DataTable :value="partners" :loading="loading" striped-rows paginator :rows="10">
          <Column field="name" header="نام" />
          <Column header="سهم">
            <template #body="{ data }: { data: Partner }">
              {{ data.sharePercent }}٪
            </template>
          </Column>
          <Column field="coaCapitalAccountCode" header="حساب سرمایه" />
          <Column field="coaDrawingAccountCode" header="حساب برداشت" />
          <Column header="وضعیت">
            <template #body="{ data }: { data: Partner }">
              <Tag :value="data.isActive ? 'فعال' : 'غیرفعال'" :severity="data.isActive ? 'success' : 'secondary'" />
            </template>
          </Column>
          <Column header="عملیات">
            <template #body="{ data }: { data: Partner }">
              <div class="flex gap-1">
                <Button icon="pi pi-pencil" text rounded @click="openEdit(data)" />
                <Button
                  v-if="data.isActive"
                  icon="pi pi-ban"
                  text
                  rounded
                  severity="danger"
                  @click="deactivate(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
        <EmptyState
          v-if="!loading && partners.length === 0"
          title="شریکی تعریف نشده"
          description="شرکا را با سهم مالکیت (مجموع ۱۰۰٪) تعریف کنید"
          icon="pi pi-users"
          action-label="شریک جدید"
          @action="openCreate"
        />
      </TabPanel>

      <TabPanel header="تفکیک موجودی">
        <div class="flex flex-wrap gap-3 mb-4 items-end">
          <JalaliDatePicker v-model="balanceFrom" label="از" />
          <JalaliDatePicker v-model="balanceTo" label="تا" />
          <Button label="محاسبه" icon="pi pi-calculator" @click="loadBalances" />
        </div>
        <template v-if="balances">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div class="hy-surface p-4">
              <p class="text-sm text-[var(--hy-muted)] m-0">
                دارایی: {{ formatMoneyFa(balances.totalAssets) }} ·
                بدهی: {{ formatMoneyFa(balances.totalLiabilities) }} ·
                خالص: {{ formatMoneyFa(balances.netEquity) }}
              </p>
              <Tag
                class="mt-2"
                :value="balances.isShareValid ? 'سهم‌ها ۱۰۰٪' : `سهم‌ها ${balances.sharePercentTotal}٪`"
                :severity="balances.isShareValid ? 'success' : 'warn'"
              />
            </div>
            <div v-if="ownershipChart" class="hy-surface p-4">
              <HyDoughnutChart
                :labels="ownershipChart.labels"
                :data="ownershipChart.data"
                :colors="ownershipChart.colors"
                title="تفکیک سهم شرکا"
              />
            </div>
          </div>
          <DataTable :value="balances.rows" striped-rows>
            <Column field="partnerName" header="شریک" />
            <Column header="سهم">
              <template #body="{ data }">{{ data.sharePercent }}٪</template>
            </Column>
            <Column header="سهم از equity">
              <template #body="{ data }">{{ formatMoneyFa(data.equityShare) }}</template>
            </Column>
            <Column header="سهم سود">
              <template #body="{ data }">{{ formatMoneyFa(data.profitShare) }}</template>
            </Column>
            <Column header="برداشت">
              <template #body="{ data }">{{ formatMoneyFa(data.drawings) }}</template>
            </Column>
            <Column header="مانده خالص">
              <template #body="{ data }">{{ formatMoneyFa(data.netBalance) }}</template>
            </Column>
          </DataTable>
        </template>
      </TabPanel>

      <TabPanel header="برداشت‌ها">
        <DataTable :value="drawings" striped-rows paginator :rows="10">
          <Column field="dateJalali" header="تاریخ" />
          <Column field="partnerName" header="شریک" />
          <Column header="مبلغ">
            <template #body="{ data }: { data: PartnerDrawing }">
              {{ formatMoneyFa(data.amount) }}
            </template>
          </Column>
          <Column field="description" header="شرح" />
          <Column field="voucherNumber" header="سند" />
        </DataTable>
      </TabPanel>
    </TabView>

    <Dialog v-model:visible="dialogVisible" :header="editing ? 'ویرایش شریک' : 'شریک جدید'" modal class="w-full max-w-md">
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label>نام</label>
          <InputText v-model="form.name" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label>سهم مالکیت (٪)</label>
          <InputNumber v-model="form.sharePercent" :min="0.01" :max="100" :max-fraction-digits="2" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label>موبایل</label>
          <InputText v-model="form.mobile" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label>کد ملی</label>
          <InputText v-model="form.nationalId" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="انصراف" text severity="secondary" @click="dialogVisible = false" />
        <Button label="ثبت" :loading="saving" @click="save" />
      </template>
    </Dialog>

    <Dialog v-model:visible="drawingDialog" header="برداشت شریک" modal class="w-full max-w-lg">
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label>شریک</label>
          <Select
            v-model="drawingForm.partnerId"
            :options="partners.filter((p) => p.isActive)"
            option-label="name"
            option-value="id"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label>تاریخ</label>
          <JalaliDatePicker v-model="drawingForm.dateJalali" />
        </div>
        <div class="flex flex-col gap-1">
          <label>مبلغ (ریال)</label>
          <InputNumber v-model="drawingForm.amount" :min="0" locale="fa-IR" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label>پرداخت از</label>
          <Select v-model="drawingForm.payFrom" :options="payFromOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div v-if="drawingForm.payFrom === 'CASH'" class="flex flex-col gap-1">
          <label>صندوق</label>
          <Select v-model="drawingForm.cashAccountId" :options="cashAccounts" option-label="name" option-value="id" class="w-full" />
        </div>
        <div v-else class="flex flex-col gap-1">
          <label>بانک</label>
          <Select v-model="drawingForm.bankAccountId" :options="bankAccounts" option-label="name" option-value="id" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label>شرح</label>
          <InputText v-model="drawingForm.description" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="انصراف" text severity="secondary" @click="drawingDialog = false" />
        <Button label="ثبت" :loading="saving" @click="saveDrawing" />
      </template>
    </Dialog>
  </div>
</template>
