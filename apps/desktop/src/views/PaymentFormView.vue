<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import Button from "primevue/button";
import Select from "primevue/select";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type { Account, BankAccount, Party } from "@hesabyar/shared";
import { PAYMENT_METHOD_LABELS, todayJalali } from "@hesabyar/shared";
import {
  createPayment,
  createReceipt,
  fetchAccounts,
  fetchBankAccounts,
  fetchParties,
} from "@/lib/api";
import { parseMoneyInput } from "@/lib/money";
import PageHeader from "@/components/PageHeader.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import { ux } from "@/locale/ux-copy";

const router = useRouter();
const toast = useToast();

const dateJalali = ref(todayJalali());
const amount = ref<number | null>(null);
const description = ref("");
const cashAccountId = ref<string | null>(null);
const bankAccountId = ref<string | null>(null);
const receiptPartyId = ref<string | null>(null);
const paymentPartyId = ref<string | null>(null);
const receiptMethod = ref<"CASH" | "CHECK_RECEIVABLE">("CASH");
const paymentMethod = ref<"CASH" | "CHECK_PAYABLE">("CASH");
const saving = ref(false);

const checkForm = ref({
  sayyadNumber: "",
  issueJalali: todayJalali(),
  dueJalali: todayJalali(),
  drawerNationalId: "",
  drawerMobile: "",
  bankName: "",
  branchCode: "",
  accountNumber: "",
});

function isCheckValid(): boolean {
  const c = checkForm.value;
  return (
    /^\d{16}$/.test(c.sayyadNumber) &&
    /^\d{10}$/.test(c.drawerNationalId) &&
    /^09\d{9}$/.test(c.drawerMobile) &&
    c.bankName.trim().length > 0 &&
    c.dueJalali >= c.issueJalali
  );
}

function checkPayload() {
  const c = checkForm.value;
  return {
    sayyadNumber: c.sayyadNumber,
    issueJalali: c.issueJalali,
    dueJalali: c.dueJalali,
    drawerNationalId: c.drawerNationalId,
    drawerMobile: c.drawerMobile,
    bankName: c.bankName.trim(),
    branchCode: c.branchCode.trim() || null,
    accountNumber: c.accountNumber.trim() || null,
  };
}

const customers = ref<Party[]>([]);
const suppliers = ref<Party[]>([]);
const cashAccounts = ref<Account[]>([]);
const bankAccounts = ref<BankAccount[]>([]);

const receiptMethodOptions = [
  { value: "CASH" as const, label: PAYMENT_METHOD_LABELS.CASH },
  { value: "CHECK_RECEIVABLE" as const, label: PAYMENT_METHOD_LABELS.CHECK_RECEIVABLE },
];

const paymentMethodOptions = [
  { value: "CASH" as const, label: PAYMENT_METHOD_LABELS.CASH },
  { value: "CHECK_PAYABLE" as const, label: PAYMENT_METHOD_LABELS.CHECK_PAYABLE },
];

const canSaveReceipt = computed(() => {
  if (!receiptPartyId.value || !amount.value || amount.value <= 0) return false;
  if (receiptMethod.value === "CHECK_RECEIVABLE") return isCheckValid();
  return Boolean(cashAccountId.value || bankAccountId.value);
});

const canSavePayment = computed(() => {
  if (!paymentPartyId.value || !amount.value || amount.value <= 0) return false;
  if (paymentMethod.value === "CHECK_PAYABLE") return isCheckValid();
  return Boolean(cashAccountId.value || bankAccountId.value);
});

async function load(): Promise<void> {
  const [cust, supp, accs, banks] = await Promise.all([
    fetchParties("CUSTOMER"),
    fetchParties("SUPPLIER"),
    fetchAccounts(),
    fetchBankAccounts(),
  ]);
  customers.value = cust.filter((p) => p.isActive);
  suppliers.value = supp.filter((p) => p.isActive);
  cashAccounts.value = accs.filter(
    (a) => a.isActive && a.code === "11101",
  );
  bankAccounts.value = banks.filter((b) => b.isActive);
  if (cashAccounts.value[0]) {
    cashAccountId.value = cashAccounts.value[0].id;
  }
}

async function submitReceipt(): Promise<void> {
  if (!canSaveReceipt.value || !receiptPartyId.value) return;
  saving.value = true;
  try {
    const voucher = await createReceipt({
      dateJalali: dateJalali.value,
      partyId: receiptPartyId.value,
      amount: BigInt(parseMoneyInput(String(amount.value))),
      method: receiptMethod.value,
      cashAccountId: receiptMethod.value === "CASH" ? cashAccountId.value ?? undefined : undefined,
      bankAccountId: receiptMethod.value === "CASH" ? bankAccountId.value ?? undefined : undefined,
      check: receiptMethod.value === "CHECK_RECEIVABLE" ? checkPayload() : undefined,
      description: description.value || undefined,
    });
    toast.add({
      severity: "success",
      summary: ux.payments.receiptOk,
      detail: voucher.number,
      life: 4000,
    });
    await router.push(`/vouchers/${voucher.id}`);
  } catch {
    toast.add({ severity: "error", summary: ux.payments.error, life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function submitPayment(): Promise<void> {
  if (!canSavePayment.value || !paymentPartyId.value) return;
  saving.value = true;
  try {
    const voucher = await createPayment({
      dateJalali: dateJalali.value,
      partyId: paymentPartyId.value,
      amount: BigInt(parseMoneyInput(String(amount.value))),
      method: paymentMethod.value,
      cashAccountId: paymentMethod.value === "CASH" ? cashAccountId.value ?? undefined : undefined,
      bankAccountId: paymentMethod.value === "CASH" ? bankAccountId.value ?? undefined : undefined,
      check: paymentMethod.value === "CHECK_PAYABLE" ? checkPayload() : undefined,
      description: description.value || undefined,
    });
    toast.add({
      severity: "success",
      summary: ux.payments.paymentOk,
      detail: voucher.number,
      life: 4000,
    });
    await router.push(`/vouchers/${voucher.id}`);
  } catch {
    toast.add({ severity: "error", summary: ux.payments.error, life: 4000 });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="hy-page" dir="rtl">
    <Toast />
    <PageHeader
      :title="ux.payments.title"
      :subtitle="ux.payments.subtitle"
    />

    <TabView>
      <TabPanel :header="ux.payments.receiptTab" value="0">
        <div class="hy-surface p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <JalaliDatePicker v-model="dateJalali" />
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">مشتری</label>
            <Select
              v-model="receiptPartyId"
              :options="customers"
              option-label="name"
              option-value="id"
              filter
              placeholder="انتخاب مشتری"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-1 md:col-span-2">
            <label class="text-sm text-[var(--hy-muted)]">روش دریافت</label>
            <Select
              v-model="receiptMethod"
              :options="receiptMethodOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <template v-if="receiptMethod === 'CASH'">
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">صندوق</label>
              <Select
                v-model="cashAccountId"
                :options="cashAccounts"
                :option-label="(a: Account) => `${a.code} — ${a.name}`"
                option-value="id"
                show-clear
                class="w-full"
                @change="bankAccountId = null"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">حساب بانکی</label>
              <Select
                v-model="bankAccountId"
                :options="bankAccounts"
                :option-label="(b: BankAccount) => `${b.bankName} — ${b.name}`"
                option-value="id"
                show-clear
                placeholder="—"
                class="w-full"
                @change="cashAccountId = null"
              />
            </div>
          </template>
          <template v-if="receiptMethod === 'CHECK_RECEIVABLE'">
            <div class="md:col-span-2 text-sm font-medium text-[var(--hy-muted)]">
              اطلاعات چک صیادی
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-sm text-[var(--hy-muted)]">شماره صیاد</label>
              <InputText v-model="checkForm.sayyadNumber" maxlength="16" dir="ltr" class="w-full" />
            </div>
            <JalaliDatePicker v-model="checkForm.issueJalali" />
            <JalaliDatePicker v-model="checkForm.dueJalali" />
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">کد ملی</label>
              <InputText v-model="checkForm.drawerNationalId" maxlength="10" dir="ltr" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">موبایل</label>
              <InputText v-model="checkForm.drawerMobile" maxlength="11" dir="ltr" class="w-full" />
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-sm text-[var(--hy-muted)]">بانک</label>
              <InputText v-model="checkForm.bankName" class="w-full" />
            </div>
          </template>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">مبلغ (ریال)</label>
            <InputNumber
              v-model="amount"
              locale="fa-IR"
              :min="0"
              class="w-full"
            />
          </div>
          <div class="md:col-span-2 flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">شرح (اختیاری)</label>
            <InputText v-model="description" class="w-full" />
          </div>
          <Button
            :label="ux.payments.receiptSubmit"
            icon="pi pi-wallet"
            class="min-h-11 md:col-span-2"
            :disabled="!canSaveReceipt"
            :loading="saving"
            @click="submitReceipt"
          />
        </div>
      </TabPanel>

      <TabPanel :header="ux.payments.paymentTab" value="1">
        <div class="hy-surface p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <JalaliDatePicker v-model="dateJalali" />
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">تأمین‌کننده</label>
            <Select
              v-model="paymentPartyId"
              :options="suppliers"
              option-label="name"
              option-value="id"
              filter
              placeholder="انتخاب تأمین‌کننده"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-1 md:col-span-2">
            <label class="text-sm text-[var(--hy-muted)]">روش پرداخت</label>
            <Select
              v-model="paymentMethod"
              :options="paymentMethodOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <template v-if="paymentMethod === 'CASH'">
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">صندوق</label>
              <Select
                v-model="cashAccountId"
                :options="cashAccounts"
                :option-label="(a: Account) => `${a.code} — ${a.name}`"
                option-value="id"
                show-clear
                class="w-full"
                @change="bankAccountId = null"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">حساب بانکی</label>
              <Select
                v-model="bankAccountId"
                :options="bankAccounts"
                :option-label="(b: BankAccount) => `${b.bankName} — ${b.name}`"
                option-value="id"
                show-clear
                placeholder="—"
                class="w-full"
                @change="cashAccountId = null"
              />
            </div>
          </template>
          <template v-if="paymentMethod === 'CHECK_PAYABLE'">
            <div class="md:col-span-2 text-sm font-medium text-[var(--hy-muted)]">
              اطلاعات چک صیادی
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-sm text-[var(--hy-muted)]">شماره صیاد</label>
              <InputText v-model="checkForm.sayyadNumber" maxlength="16" dir="ltr" class="w-full" />
            </div>
            <JalaliDatePicker v-model="checkForm.issueJalali" />
            <JalaliDatePicker v-model="checkForm.dueJalali" />
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">کد ملی</label>
              <InputText v-model="checkForm.drawerNationalId" maxlength="10" dir="ltr" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">موبایل</label>
              <InputText v-model="checkForm.drawerMobile" maxlength="11" dir="ltr" class="w-full" />
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-sm text-[var(--hy-muted)]">بانک</label>
              <InputText v-model="checkForm.bankName" class="w-full" />
            </div>
          </template>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">مبلغ (ریال)</label>
            <InputNumber
              v-model="amount"
              locale="fa-IR"
              :min="0"
              class="w-full"
            />
          </div>
          <div class="md:col-span-2 flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">شرح (اختیاری)</label>
            <InputText v-model="description" class="w-full" />
          </div>
          <Button
            :label="ux.payments.paymentSubmit"
            icon="pi pi-money-bill"
            class="min-h-11 md:col-span-2"
            :disabled="!canSavePayment"
            :loading="saving"
            @click="submitPayment"
          />
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>
