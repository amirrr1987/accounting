<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Select from "primevue/select";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type { CheckKind, CreateCheckInput, Party } from "@hesabyar/shared";
import { todayJalali } from "@hesabyar/shared";
import { createCheck, fetchParties } from "@/lib/api";
import { formatMoneyFa, parseMoneyInput } from "@/lib/money";
import { useMoneyDisplay } from "@/composables/useMoneyDisplay";
import { usePageCopy } from "@/composables/usePageCopy";
import PageHeader from "@/components/PageHeader.vue";
import MobileStepWizard from "@/components/MobileStepWizard.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import { ux } from "@/locale/ux-copy";

const router = useRouter();
const toast = useToast();
const { copy: pageCopy } = usePageCopy("checks");
const { inputLabel } = useMoneyDisplay();

const saving = ref(false);
const wizardStep = ref(0);
const customers = ref<Party[]>([]);
const suppliers = ref<Party[]>([]);

const form = reactive({
  kind: "RECEIVABLE" as CheckKind,
  partyId: null as string | null,
  amount: null as number | null,
  dateJalali: todayJalali(),
  sayyadNumber: "",
  issueJalali: todayJalali(),
  dueJalali: todayJalali(),
  drawerNationalId: "",
  drawerMobile: "",
  bankName: "",
  branchCode: "",
  accountNumber: "",
  description: "",
});

const kindOptions = [
  { label: ux.checkWizard.received, value: "RECEIVABLE" as const },
  { label: ux.checkWizard.payable, value: "PAYABLE" as const },
];

const wizardSteps = computed(() => [
  ux.checkWizard.stepKind,
  ux.checkWizard.stepDetails,
  ux.checkWizard.stepDrawer,
  ux.checkWizard.stepReview,
]);

const parties = computed(() =>
  form.kind === "RECEIVABLE" ? customers.value : suppliers.value,
);

const partyName = computed(
  () => parties.value.find((p) => p.id === form.partyId)?.name ?? "—",
);

const wizardCanNext = computed(() => {
  if (wizardStep.value === 0) return Boolean(form.partyId);
  if (wizardStep.value === 1) {
    return (
      Boolean(form.amount && form.amount > 0) &&
      /^\d{16}$/.test(form.sayyadNumber) &&
      form.dueJalali >= form.issueJalali
    );
  }
  if (wizardStep.value === 2) {
    return (
      /^\d{10}$/.test(form.drawerNationalId) &&
      /^09\d{9}$/.test(form.drawerMobile) &&
      form.bankName.trim().length > 0
    );
  }
  return true;
});

function pickKind(kind: CheckKind): void {
  form.kind = kind;
  form.partyId = null;
}

function wizardNext(): void {
  if (wizardStep.value < wizardSteps.value.length - 1) wizardStep.value += 1;
}

function wizardBack(): void {
  if (wizardStep.value > 0) wizardStep.value -= 1;
}

async function confirmSave(): Promise<void> {
  if (!form.partyId || !form.amount) return;
  saving.value = true;
  try {
    const payload: CreateCheckInput = {
      kind: form.kind,
      partyId: form.partyId,
      amount: BigInt(parseMoneyInput(String(form.amount))),
      dateJalali: form.dateJalali,
      sayyadNumber: form.sayyadNumber,
      issueJalali: form.issueJalali,
      dueJalali: form.dueJalali,
      drawerNationalId: form.drawerNationalId,
      drawerMobile: form.drawerMobile,
      bankName: form.bankName.trim(),
      branchCode: form.branchCode.trim() || null,
      accountNumber: form.accountNumber.trim() || null,
      description: form.description || undefined,
    };
    const check = await createCheck(payload);
    toast.add({
      severity: "success",
      summary: ux.checkWizard.saved,
      detail: check.sayyadNumber,
      life: 3500,
    });
    await router.push("/checks");
  } catch {
    toast.add({
      severity: "error",
      summary: ux.nav.checks,
      detail: ux.checkWizard.saveError,
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    const [cust, supp] = await Promise.all([
      fetchParties("CUSTOMER"),
      fetchParties("SUPPLIER"),
    ]);
    customers.value = cust.filter((p) => p.isActive);
    suppliers.value = supp.filter((p) => p.isActive);
  } catch {
    toast.add({
      severity: "error",
      summary: ux.nav.checks,
      detail: "بارگذاری طرف‌حساب‌ها ناموفق بود",
      life: 4000,
    });
  }
});
</script>

<template>
  <div class="hy-page-mobile space-y-4" dir="rtl">
    <Toast />

    <PageHeader
      :title="pageCopy.title"
      :subtitle="pageCopy.subtitle"
      :hint="pageCopy.hint"
    >
      <template #actions>
        <Button
          icon="pi pi-times"
          text
          rounded
          class="hy-touch"
          @click="router.push('/checks')"
        />
      </template>
    </PageHeader>

    <MobileStepWizard
      :steps="wizardSteps"
      :step="wizardStep"
      :can-next="wizardCanNext"
      :loading="saving"
      :finish-label="ux.checkWizard.confirmSave"
      @back="wizardBack"
      @next="wizardNext"
      @finish="confirmSave"
    >
      <div v-if="wizardStep === 0" class="space-y-4">
        <div class="grid grid-cols-1 gap-3">
          <button
            v-for="opt in kindOptions"
            :key="opt.value"
            type="button"
            class="hy-surface p-5 text-right min-h-[5rem] border-2 transition-colors"
            :class="
              form.kind === opt.value
                ? 'border-[var(--hy-primary)]'
                : 'border-transparent'
            "
            @click="pickKind(opt.value)"
          >
            <p class="font-bold m-0 text-lg">{{ opt.label }}</p>
          </button>
        </div>
        <div class="hy-surface p-4">
          <label class="text-sm text-[var(--hy-muted)]">
            {{
              form.kind === "RECEIVABLE"
                ? ux.checkWizard.customer
                : ux.checkWizard.supplier
            }}
          </label>
          <Select
            v-model="form.partyId"
            :options="parties"
            option-label="name"
            option-value="id"
            filter
            placeholder="انتخاب…"
            class="w-full mt-2"
          />
        </div>
      </div>

      <div v-else-if="wizardStep === 1" class="hy-surface p-4 space-y-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm text-[var(--hy-muted)]">
            {{ ux.checkWizard.sayyad }}
          </label>
          <InputText
            v-latin-digits
            v-model="form.sayyadNumber"
            maxlength="16"
            dir="ltr"
            class="w-full min-h-11"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-[var(--hy-muted)]">
            {{ ux.checkWizard.amount }} ({{ inputLabel }})
          </label>
          <InputNumber v-latin-digits
            v-model="form.amount"
            locale="fa-IR"
            :min="0"
            class="w-full"
          />
        </div>
        <JalaliDatePicker v-model="form.issueJalali" :label="ux.checkWizard.issueDate" />
        <JalaliDatePicker v-model="form.dueJalali" :label="ux.checkWizard.dueDate" />
        <JalaliDatePicker v-model="form.dateJalali" label="تاریخ ثبت سند" />
      </div>

      <div v-else-if="wizardStep === 2" class="hy-surface p-4 space-y-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm text-[var(--hy-muted)]">
            {{ ux.checkWizard.nationalId }}
          </label>
          <InputText
            v-latin-digits
            v-model="form.drawerNationalId"
            maxlength="10"
            dir="ltr"
            class="w-full min-h-11"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-[var(--hy-muted)]">
            {{ ux.checkWizard.mobile }}
          </label>
          <InputText
            v-latin-digits
            v-model="form.drawerMobile"
            maxlength="11"
            dir="ltr"
            class="w-full min-h-11"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-[var(--hy-muted)]">
            {{ ux.checkWizard.bank }}
          </label>
          <InputText v-model="form.bankName" class="w-full min-h-11" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-[var(--hy-muted)]">
            {{ ux.checkWizard.branchOptional }}
          </label>
          <InputText v-latin-digits v-model="form.branchCode" class="w-full min-h-11" />
        </div>
        <InputText
          v-model="form.description"
          placeholder="شرح (اختیاری)"
          class="w-full min-h-11"
        />
      </div>

      <div v-else class="hy-surface p-4 space-y-3">
        <Tag
          :value="
            form.kind === 'RECEIVABLE'
              ? ux.checkWizard.received
              : ux.checkWizard.payable
          "
          severity="info"
        />
        <p class="m-0 text-sm">
          <span class="text-[var(--hy-muted)]">{{ ux.checkWizard.summaryParty }}:</span>
          {{ partyName }}
        </p>
        <p class="m-0 text-sm">
          <span class="text-[var(--hy-muted)]">{{ ux.checkWizard.summaryAmount }}:</span>
          {{ formatMoneyFa(form.amount ?? 0) }}
        </p>
        <p class="m-0 text-sm">
          <span class="text-[var(--hy-muted)]">{{ ux.checkWizard.summaryDue }}:</span>
          {{ form.dueJalali }}
        </p>
        <p class="m-0 text-sm font-mono" dir="ltr">{{ form.sayyadNumber }}</p>
      </div>
    </MobileStepWizard>
  </div>
</template>
