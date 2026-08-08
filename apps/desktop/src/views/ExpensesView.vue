<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type {
  Account,
  BankAccount,
  CreateExpenseInput,
  CreateOwnerDrawingInput,
  CreateOwnerInput,
  Expense,
  ExpenseCategory,
  ExpensePayFrom,
  ExpenseSummary,
  Owner,
  OwnerDrawing,
  Party,
} from "@hesabyar/shared";
import {
  EXPENSE_PAY_FROM_LABELS,
  todayJalali,
} from "@hesabyar/shared";
import {
  createExpense,
  createOwner,
  createOwnerDrawing,
  fetchAccounts,
  fetchBankAccounts,
  fetchExpenseCategories,
  fetchExpenseSummary,
  fetchExpenses,
  fetchOwnerDrawings,
  fetchOwners,
  fetchParties,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import { formatMoneyFa, parseMoneyInput } from "@/lib/money";
import { ux } from "@/locale/ux-copy";

const toast = useToast();

const categories = ref<ExpenseCategory[]>([]);
const expenses = ref<Expense[]>([]);
const owners = ref<Owner[]>([]);
const drawings = ref<OwnerDrawing[]>([]);
const parties = ref<Party[]>([]);
const cashAccounts = ref<Account[]>([]);
const bankAccounts = ref<BankAccount[]>([]);
const summary = ref<ExpenseSummary | null>(null);

const loading = ref(false);
const saving = ref(false);
const expenseDialog = ref(false);
const drawingDialog = ref(false);
const ownerDialog = ref(false);

const summaryFrom = ref(todayJalali().slice(0, 8) + "01");
const summaryTo = ref(todayJalali());

const expenseForm = reactive({
  categoryId: null as string | null,
  dateJalali: todayJalali(),
  amount: null as number | null,
  description: "",
  payFrom: "CASH" as ExpensePayFrom,
  cashAccountId: null as string | null,
  bankAccountId: null as string | null,
  partyId: null as string | null,
});

const drawingForm = reactive({
  ownerId: null as string | null,
  dateJalali: todayJalali(),
  amount: null as number | null,
  description: "",
  payFrom: "CASH" as ExpensePayFrom,
  cashAccountId: null as string | null,
  bankAccountId: null as string | null,
});

const ownerForm = reactive({
  name: "",
  mobile: "",
  nationalId: "",
});

const payFromOptions = Object.entries(EXPENSE_PAY_FROM_LABELS).map(
  ([value, label]) => ({ value: value as ExpensePayFrom, label }),
);

const supplierOptions = computed(() =>
  parties.value.filter((p) => p.kind === "SUPPLIER" && p.isActive),
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [
      cats,
      exps,
      own,
      drw,
      pts,
      accts,
      banks,
    ] = await Promise.all([
      fetchExpenseCategories(),
      fetchExpenses(),
      fetchOwners(),
      fetchOwnerDrawings(),
      fetchParties(),
      fetchAccounts(),
      fetchBankAccounts(),
    ]);
    categories.value = cats;
    expenses.value = exps;
    owners.value = own;
    drawings.value = drw;
    parties.value = pts;
    cashAccounts.value = accts.filter(
      (a) => a.code === "11101" && a.isActive && a.level === "DETAIL",
    );
    bankAccounts.value = banks.filter((b) => b.isActive);
    if (cashAccounts.value[0]) {
      expenseForm.cashAccountId = cashAccounts.value[0].id;
      drawingForm.cashAccountId = cashAccounts.value[0].id;
    }
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری مخارج ناموفق بود",
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
}

async function loadSummary(): Promise<void> {
  try {
    summary.value = await fetchExpenseSummary(summaryFrom.value, summaryTo.value);
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری خلاصه مخارج ناموفق بود",
      life: 4000,
    });
  }
}

onMounted(() => {
  void load();
  void loadSummary();
});

function openExpenseDialog(): void {
  expenseForm.categoryId = categories.value[0]?.id ?? null;
  expenseForm.dateJalali = todayJalali();
  expenseForm.amount = null;
  expenseForm.description = "";
  expenseForm.payFrom = "CASH";
  expenseForm.bankAccountId = null;
  expenseForm.partyId = null;
  expenseDialog.value = true;
}

function openDrawingDialog(): void {
  drawingForm.ownerId = owners.value[0]?.id ?? null;
  drawingForm.dateJalali = todayJalali();
  drawingForm.amount = null;
  drawingForm.description = "";
  drawingForm.payFrom = "CASH";
  drawingForm.bankAccountId = null;
  drawingDialog.value = true;
}

async function saveExpense(): Promise<void> {
  if (!expenseForm.categoryId || expenseForm.amount == null) return;
  saving.value = true;
  try {
    const payload: CreateExpenseInput = {
      categoryId: expenseForm.categoryId,
      dateJalali: expenseForm.dateJalali,
      amount: parseMoneyInput(expenseForm.amount),
      description: expenseForm.description,
      payFrom: expenseForm.payFrom,
      cashAccountId:
        expenseForm.payFrom === "CASH"
          ? (expenseForm.cashAccountId ?? undefined)
          : undefined,
      bankAccountId:
        expenseForm.payFrom === "BANK"
          ? (expenseForm.bankAccountId ?? undefined)
          : undefined,
      partyId: expenseForm.partyId,
    };
    const created = await createExpense(payload);
    expenses.value = [created, ...expenses.value];
    expenseDialog.value = false;
    void loadSummary();
    toast.add({
      severity: "success",
      summary: "ثبت شد",
      detail: "هزینه با موفقیت ثبت شد",
      life: 3000,
    });
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "ثبت هزینه ناموفق بود",
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}

async function saveDrawing(): Promise<void> {
  if (!drawingForm.ownerId || drawingForm.amount == null) return;
  saving.value = true;
  try {
    const payload: CreateOwnerDrawingInput = {
      ownerId: drawingForm.ownerId,
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
    const created = await createOwnerDrawing(payload);
    drawings.value = [created, ...drawings.value];
    drawingDialog.value = false;
    toast.add({
      severity: "success",
      summary: "ثبت شد",
      detail: "برداشت شخصی ثبت شد",
      life: 3000,
    });
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "ثبت برداشت ناموفق بود",
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}

async function saveOwner(): Promise<void> {
  if (!ownerForm.name.trim()) return;
  saving.value = true;
  try {
    const payload: CreateOwnerInput = {
      name: ownerForm.name.trim(),
      mobile: ownerForm.mobile.trim() || null,
      nationalId: ownerForm.nationalId.trim() || null,
    };
    const created = await createOwner(payload);
    owners.value = [...owners.value, created];
    ownerDialog.value = false;
    toast.add({
      severity: "success",
      summary: "ثبت شد",
      detail: "مالک جدید اضافه شد",
      life: 3000,
    });
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "ثبت مالک ناموفق بود",
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Toast />
  <div class="flex flex-col gap-4 p-4 md:p-6">
    <PageHeader
      :title="ux.nav.expenses"
      subtitle="ثبت هزینه‌های جاری، دستمزد کارگر و برداشت شخصی مالک"
    />

    <TabView>
      <TabPanel header="هزینه‌ها">
        <div class="mb-4 flex justify-end">
          <Button
            label="هزینه جدید"
            icon="pi pi-plus"
            @click="openExpenseDialog"
          />
        </div>
        <DataTable
          :value="expenses"
          :loading="loading"
          striped-rows
          paginator
          :rows="10"
          empty-message="هنوز هزینه‌ای ثبت نشده"
        >
          <Column field="dateJalali" header="تاریخ" />
          <Column field="categoryName" header="دسته" />
          <Column header="مبلغ">
            <template #body="{ data }: { data: Expense }">
              {{ formatMoneyFa(data.amount) }}
            </template>
          </Column>
          <Column field="description" header="شرح" />
          <Column header="پرداخت از">
            <template #body="{ data }: { data: Expense }">
              {{ EXPENSE_PAY_FROM_LABELS[data.payFrom] }}
            </template>
          </Column>
          <Column field="partyName" header="طرف‌حساب" />
          <Column field="voucherNumber" header="سند" />
        </DataTable>
      </TabPanel>

      <TabPanel header="برداشت شخصی">
        <div class="mb-4 flex flex-wrap gap-2 justify-end">
          <Button
            label="مالک جدید"
            icon="pi pi-user-plus"
            severity="secondary"
            outlined
            @click="ownerDialog = true"
          />
          <Button
            label="برداشت جدید"
            icon="pi pi-plus"
            @click="openDrawingDialog"
          />
        </div>
        <DataTable
          :value="drawings"
          :loading="loading"
          striped-rows
          paginator
          :rows="10"
          empty-message="برداشت شخصی ثبت نشده"
        >
          <Column field="dateJalali" header="تاریخ" />
          <Column field="ownerName" header="مالک" />
          <Column header="مبلغ">
            <template #body="{ data }: { data: OwnerDrawing }">
              {{ formatMoneyFa(data.amount) }}
            </template>
          </Column>
          <Column field="description" header="شرح" />
          <Column header="پرداخت از">
            <template #body="{ data }: { data: OwnerDrawing }">
              {{ EXPENSE_PAY_FROM_LABELS[data.payFrom] }}
            </template>
          </Column>
          <Column field="voucherNumber" header="سند" />
        </DataTable>
      </TabPanel>

      <TabPanel header="خلاصه دوره">
        <div class="mb-4 flex flex-wrap items-end gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm text-surface-600">از تاریخ</label>
            <JalaliDatePicker v-model="summaryFrom" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-surface-600">تا تاریخ</label>
            <JalaliDatePicker v-model="summaryTo" />
          </div>
          <Button label="بروزرسانی" icon="pi pi-refresh" @click="loadSummary" />
        </div>
        <template v-if="summary">
          <p class="mb-3 text-lg font-semibold">
            جمع کل:
            {{ formatMoneyFa(summary.grandTotal) }}
          </p>
          <DataTable :value="summary.rows" striped-rows>
            <Column field="categoryName" header="دسته هزینه" />
            <Column field="count" header="تعداد" />
            <Column header="جمع">
              <template #body="{ data }">
                {{ formatMoneyFa(data.total) }}
              </template>
            </Column>
          </DataTable>
          <EmptyState
            v-if="summary.rows.length === 0"
            title="هزینه‌ای در این بازه نیست"
          />
        </template>
      </TabPanel>
    </TabView>

    <Dialog
      v-model:visible="expenseDialog"
      header="ثبت هزینه"
      modal
      class="w-full max-w-lg"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label>دسته هزینه</label>
          <Select
            v-model="expenseForm.categoryId"
            :options="categories"
            option-label="nameFa"
            option-value="id"
            placeholder="انتخاب کنید"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label>تاریخ</label>
          <JalaliDatePicker v-model="expenseForm.dateJalali" />
        </div>
        <div class="flex flex-col gap-1">
          <label>مبلغ (ریال)</label>
          <InputNumber
            v-model="expenseForm.amount"
            :min="0"
            locale="fa-IR"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label>پرداخت از</label>
          <Select
            v-model="expenseForm.payFrom"
            :options="payFromOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
        <div v-if="expenseForm.payFrom === 'CASH'" class="flex flex-col gap-1">
          <label>صندوق</label>
          <Select
            v-model="expenseForm.cashAccountId"
            :options="cashAccounts"
            option-label="name"
            option-value="id"
            class="w-full"
          />
        </div>
        <div v-else class="flex flex-col gap-1">
          <label>حساب بانکی</label>
          <Select
            v-model="expenseForm.bankAccountId"
            :options="bankAccounts"
            option-label="name"
            option-value="id"
            placeholder="انتخاب حساب بانکی"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label>طرف‌حساب (اختیاری — کارگر/تأمین‌کننده)</label>
          <Select
            v-model="expenseForm.partyId"
            :options="supplierOptions"
            option-label="name"
            option-value="id"
            show-clear
            placeholder="—"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label>شرح</label>
          <InputText v-model="expenseForm.description" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="انصراف" severity="secondary" text @click="expenseDialog = false" />
        <Button label="ثبت" :loading="saving" @click="saveExpense" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="drawingDialog"
      header="برداشت شخصی مالک"
      modal
      class="w-full max-w-lg"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label>مالک</label>
          <Select
            v-model="drawingForm.ownerId"
            :options="owners"
            option-label="name"
            option-value="id"
            placeholder="انتخاب مالک"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label>تاریخ</label>
          <JalaliDatePicker v-model="drawingForm.dateJalali" />
        </div>
        <div class="flex flex-col gap-1">
          <label>مبلغ (ریال)</label>
          <InputNumber
            v-model="drawingForm.amount"
            :min="0"
            locale="fa-IR"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label>پرداخت از</label>
          <Select
            v-model="drawingForm.payFrom"
            :options="payFromOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
        <div v-if="drawingForm.payFrom === 'CASH'" class="flex flex-col gap-1">
          <label>صندوق</label>
          <Select
            v-model="drawingForm.cashAccountId"
            :options="cashAccounts"
            option-label="name"
            option-value="id"
            class="w-full"
          />
        </div>
        <div v-else class="flex flex-col gap-1">
          <label>حساب بانکی</label>
          <Select
            v-model="drawingForm.bankAccountId"
            :options="bankAccounts"
            option-label="name"
            option-value="id"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label>شرح</label>
          <InputText v-model="drawingForm.description" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="انصراف" severity="secondary" text @click="drawingDialog = false" />
        <Button label="ثبت" :loading="saving" @click="saveDrawing" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="ownerDialog"
      header="مالک جدید"
      modal
      class="w-full max-w-md"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label>نام</label>
          <InputText v-model="ownerForm.name" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label>موبایل</label>
          <InputText v-model="ownerForm.mobile" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label>کد ملی</label>
          <InputText v-model="ownerForm.nationalId" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="انصراف" severity="secondary" text @click="ownerDialog = false" />
        <Button label="ثبت" :loading="saving" @click="saveOwner" />
      </template>
    </Dialog>
  </div>
</template>
