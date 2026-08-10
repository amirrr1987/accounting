<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
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
import { apiErrorMessage } from "@/lib/api-error";
import { useMoneyDisplay } from "@/composables/useMoneyDisplay";
import { useIsMobileRef } from "@/composables/useViewport";
import { usePageCopy } from "@/composables/usePageCopy";
import PageHeader from "@/components/PageHeader.vue";
import MobileStepWizard from "@/components/MobileStepWizard.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import { ux } from "@/locale/ux-copy";

type Flow = "receipt" | "payment";

const router = useRouter();
const route = useRoute();
const toast = useToast();
const isMobile = useIsMobileRef();
const { copy: pageCopy } = usePageCopy("payments");
const { inputLabel } = useMoneyDisplay();

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

const wizardFlow = ref<Flow | null>(null);
const wizardStep = ref(0);
const payFrom = ref<"cash" | "bank">("cash");

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

const activePartyId = computed({
  get: () =>
    wizardFlow.value === "payment"
      ? paymentPartyId.value
      : receiptPartyId.value,
  set: (id: string | null) => {
    if (wizardFlow.value === "payment") paymentPartyId.value = id;
    else receiptPartyId.value = id;
  },
});

const activeParties = computed(() =>
  wizardFlow.value === "payment" ? suppliers.value : customers.value,
);

const wizardSteps = computed(() => {
  const base = wizardFlow.value
    ? [
        ux.paymentWizard.stepParty,
        ux.paymentWizard.stepAmount,
        ux.paymentWizard.stepConfirm,
      ]
    : [
        ux.paymentWizard.chooseType,
        ux.paymentWizard.stepParty,
        ux.paymentWizard.stepAmount,
        ux.paymentWizard.stepConfirm,
      ];
  return base;
});

const summaryPartyName = computed(() => {
  const id = activePartyId.value;
  return activeParties.value.find((p) => p.id === id)?.name ?? "—";
});

const wizardPhase = computed<
  "type" | "party" | "amount" | "confirm"
>(() => {
  if (!wizardFlow.value && wizardStep.value === 0) return "type";
  const base = wizardFlow.value ? wizardStep.value : wizardStep.value - 1;
  if (base <= 0) return "party";
  if (base === 1) return "amount";
  return "confirm";
});

const wizardCanNext = computed(() => {
  if (wizardPhase.value === "type") return false;
  if (wizardPhase.value === "party") return Boolean(activePartyId.value);
  if (wizardPhase.value === "amount") {
    if (!amount.value || amount.value <= 0) return false;
    if (payFrom.value === "cash") return Boolean(cashAccountId.value);
    return Boolean(bankAccountId.value);
  }
  return true;
});

function pickFlow(flow: Flow): void {
  wizardFlow.value = flow;
  receiptMethod.value = "CASH";
  paymentMethod.value = "CASH";
  wizardStep.value = 0;
}

function syncFlowFromRoute(): void {
  const q = route.query.flow;
  if (q === "receipt" || q === "payment") {
    wizardFlow.value = q;
    wizardStep.value = 0;
  }
}

function wizardBack(): void {
  if (wizardStep.value > 0) wizardStep.value -= 1;
}

function wizardNext(): void {
  if (wizardStep.value < wizardSteps.value.length - 1) {
    wizardStep.value += 1;
  }
}

function wizardFinish(): void {
  if (wizardFlow.value === "payment") void submitPayment();
  else void submitReceipt();
}

watch(payFrom, (v) => {
  if (v === "cash") {
    bankAccountId.value = null;
    if (!cashAccountId.value && cashAccounts.value[0]) {
      cashAccountId.value = cashAccounts.value[0].id;
    }
  } else {
    cashAccountId.value = null;
    if (!bankAccountId.value && bankAccounts.value[0]) {
      bankAccountId.value = bankAccounts.value[0].id;
    }
  }
});

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
  cashAccounts.value = accs.filter((a) => a.isActive && a.code === "11101");
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
      cashAccountId:
        receiptMethod.value === "CASH"
          ? cashAccountId.value ?? undefined
          : undefined,
      bankAccountId:
        receiptMethod.value === "CASH"
          ? bankAccountId.value ?? undefined
          : undefined,
      check:
        receiptMethod.value === "CHECK_RECEIVABLE" ? checkPayload() : undefined,
      description: description.value || undefined,
    });
    toast.add({
      severity: "success",
      summary: ux.payments.receiptOk,
      detail: voucher.number,
      life: 4000,
    });
    await router.push(`/vouchers/${voucher.id}`);
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.payments.error,
      detail: apiErrorMessage(err, ux.payments.error),
      life: 6000,
    });
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
      cashAccountId:
        paymentMethod.value === "CASH"
          ? cashAccountId.value ?? undefined
          : undefined,
      bankAccountId:
        paymentMethod.value === "CASH"
          ? bankAccountId.value ?? undefined
          : undefined,
      check:
        paymentMethod.value === "CHECK_PAYABLE" ? checkPayload() : undefined,
      description: description.value || undefined,
    });
    toast.add({
      severity: "success",
      summary: ux.payments.paymentOk,
      detail: voucher.number,
      life: 4000,
    });
    await router.push(`/vouchers/${voucher.id}`);
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.payments.error,
      detail: apiErrorMessage(err, ux.payments.error),
      life: 6000,
    });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  syncFlowFromRoute();
  void load();
});
</script>

<template>
  <div :class="isMobile ? 'hy-page-mobile' : 'hy-page'" dir="rtl">
    <Toast />
    <PageHeader
      :title="pageCopy.title"
      :subtitle="pageCopy.subtitle"
      :hint="pageCopy.hint"
    />

    <!-- Mobile wizard -->
    <MobileStepWizard
      v-if="isMobile"
      :steps="wizardSteps"
      :step="wizardStep"
      :can-next="wizardCanNext"
      :loading="saving"
      :finish-label="
        wizardFlow === 'payment'
          ? ux.paymentWizard.confirmPayment
          : ux.paymentWizard.confirmReceipt
      "
      @back="wizardBack"
      @next="wizardNext"
      @finish="wizardFinish"
    >
      <div v-if="wizardPhase === 'type'" class="grid grid-cols-1 gap-3">
        <button
          type="button"
          class="hy-surface p-5 text-right min-h-[5.5rem]"
          @click="pickFlow('receipt')"
        >
          <p class="font-bold m-0 text-lg">{{ ux.paymentWizard.receipt }}</p>
          <p class="text-sm text-[var(--hy-muted)] m-0 mt-1">
            {{ ux.paymentWizard.receiptHint }}
          </p>
        </button>
        <button
          type="button"
          class="hy-surface p-5 text-right min-h-[5.5rem]"
          @click="pickFlow('payment')"
        >
          <p class="font-bold m-0 text-lg">{{ ux.paymentWizard.payment }}</p>
          <p class="text-sm text-[var(--hy-muted)] m-0 mt-1">
            {{ ux.paymentWizard.paymentHint }}
          </p>
        </button>
      </div>

      <div
        v-else-if="wizardPhase === 'party'"
        class="hy-surface p-4 space-y-4"
      >
        <div class="flex flex-col gap-1">
          <label class="text-sm text-[var(--hy-muted)]">
            {{
              wizardFlow === "payment"
                ? ux.paymentWizard.supplier
                : ux.paymentWizard.customer
            }}
          </label>
          <Select
            v-model="activePartyId"
            :options="activeParties"
            option-label="name"
            option-value="id"
            filter
            class="w-full"
          />
        </div>
        <JalaliDatePicker v-model="dateJalali" />
      </div>

      <div
        v-else-if="wizardPhase === 'amount'"
        class="hy-surface p-4 space-y-4"
      >
        <div class="flex flex-col gap-1">
          <label class="text-sm text-[var(--hy-muted)]">
            {{ ux.paymentWizard.amountLabel }} ({{ inputLabel }})
          </label>
          <InputNumber v-latin-digits
            v-model="amount"
            locale="fa-IR"
            :min="0"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm text-[var(--hy-muted)]">
            {{ ux.paymentWizard.cashOrBank }}
          </label>
          <div class="grid grid-cols-2 gap-2">
            <Button
              :label="ux.paymentWizard.cash"
              :outlined="payFrom !== 'cash'"
              class="min-h-11"
              @click="payFrom = 'cash'"
            />
            <Button
              :label="ux.paymentWizard.bank"
              :outlined="payFrom !== 'bank'"
              class="min-h-11"
              @click="payFrom = 'bank'"
            />
          </div>
        </div>
        <Select
          v-if="payFrom === 'cash'"
          v-model="cashAccountId"
          :options="cashAccounts"
          :option-label="(a: Account) => a.name"
          option-value="id"
          class="w-full"
        />
        <Select
          v-else
          v-model="bankAccountId"
          :options="bankAccounts"
          :option-label="(b: BankAccount) => `${b.bankName} — ${b.name}`"
          option-value="id"
          class="w-full"
        />
        <p class="text-xs text-[var(--hy-muted)] m-0">
          {{ ux.paymentWizard.mobileCheckHint }}
        </p>
      </div>

      <div v-else class="hy-surface p-4 space-y-3 text-sm">
        <p class="m-0">
          <span class="text-[var(--hy-muted)]"
            >{{ ux.paymentWizard.summaryWho }}:</span
          >
          {{ summaryPartyName }}
        </p>
        <p class="m-0">
          <span class="text-[var(--hy-muted)]"
            >{{ ux.paymentWizard.summaryAmount }}:</span
          >
          {{ amount ?? 0 }} {{ inputLabel }}
        </p>
        <p class="m-0">
          <span class="text-[var(--hy-muted)]"
            >{{ ux.paymentWizard.summaryDate }}:</span
          >
          {{ dateJalali }}
        </p>
      </div>
    </MobileStepWizard>

    <!-- Desktop tabs -->
    <TabView v-else>
      <TabPanel :header="ux.payments.receiptTab" value="0">
        <div
          class="hy-surface p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl"
        >
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
            <div
              class="md:col-span-2 text-sm font-medium text-[var(--hy-muted)]"
            >
              اطلاعات چک صیادی
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-sm text-[var(--hy-muted)]">شماره صیاد</label>
              <InputText
                v-latin-digits
                v-model="checkForm.sayyadNumber"
                maxlength="16"
                dir="ltr"
                class="w-full"
              />
            </div>
            <JalaliDatePicker v-model="checkForm.issueJalali" />
            <JalaliDatePicker v-model="checkForm.dueJalali" />
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">کد ملی</label>
              <InputText
                v-latin-digits
                v-model="checkForm.drawerNationalId"
                maxlength="10"
                dir="ltr"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">موبایل</label>
              <InputText
                v-latin-digits
                v-model="checkForm.drawerMobile"
                maxlength="11"
                dir="ltr"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-sm text-[var(--hy-muted)]">بانک</label>
              <InputText v-model="checkForm.bankName" class="w-full" />
            </div>
          </template>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]"
              >مبلغ ({{ inputLabel }})</label
            >
            <InputNumber v-latin-digits
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
        <div
          class="hy-surface p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl"
        >
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
            <div
              class="md:col-span-2 text-sm font-medium text-[var(--hy-muted)]"
            >
              اطلاعات چک صیادی
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-sm text-[var(--hy-muted)]">شماره صیاد</label>
              <InputText
                v-latin-digits
                v-model="checkForm.sayyadNumber"
                maxlength="16"
                dir="ltr"
                class="w-full"
              />
            </div>
            <JalaliDatePicker v-model="checkForm.issueJalali" />
            <JalaliDatePicker v-model="checkForm.dueJalali" />
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">کد ملی</label>
              <InputText
                v-latin-digits
                v-model="checkForm.drawerNationalId"
                maxlength="10"
                dir="ltr"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm text-[var(--hy-muted)]">موبایل</label>
              <InputText
                v-latin-digits
                v-model="checkForm.drawerMobile"
                maxlength="11"
                dir="ltr"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-sm text-[var(--hy-muted)]">بانک</label>
              <InputText v-model="checkForm.bankName" class="w-full" />
            </div>
          </template>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]"
              >مبلغ ({{ inputLabel }})</label
            >
            <InputNumber v-latin-digits
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
