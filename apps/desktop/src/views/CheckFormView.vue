<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Select from "primevue/select";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type { CheckKind, CreateCheckInput, Party } from "@hesabyar/shared";
import { CHECK_KIND_LABELS, todayJalali } from "@hesabyar/shared";
import { createCheck, fetchParties } from "@/lib/api";
import { parseMoneyInput } from "@/lib/money";
import { useIsMobileRef } from "@/composables/useViewport";
import CheckFormMobile from "@/views/check/CheckFormMobile.vue";
import PageHeader from "@/components/PageHeader.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";

const isMobile = useIsMobileRef();

const router = useRouter();
const toast = useToast();

const saving = ref(false);
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

const kindOptions = Object.entries(CHECK_KIND_LABELS).map(([value, label]) => ({
  value: value as CheckKind,
  label,
}));

const parties = computed(() =>
  form.kind === "RECEIVABLE" ? customers.value : suppliers.value,
);

const canSave = computed(
  () =>
    form.partyId &&
    form.amount &&
    form.amount > 0 &&
    /^\d{16}$/.test(form.sayyadNumber) &&
    /^\d{10}$/.test(form.drawerNationalId) &&
    /^09\d{9}$/.test(form.drawerMobile) &&
    form.bankName.trim(),
);

async function load(): Promise<void> {
  const [cust, supp] = await Promise.all([
    fetchParties("CUSTOMER"),
    fetchParties("SUPPLIER"),
  ]);
  customers.value = cust.filter((p) => p.isActive);
  suppliers.value = supp.filter((p) => p.isActive);
}

async function save(): Promise<void> {
  if (!canSave.value || !form.partyId) return;
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
      summary: "چک ثبت شد",
      detail: check.sayyadNumber,
      life: 3500,
    });
    await router.push("/checks");
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "ثبت چک ناموفق بود",
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <CheckFormMobile v-if="isMobile" />

  <div v-else class="hy-page" dir="rtl">
    <Toast />
    <PageHeader
      title="ثبت چک صیادی"
      subtitle="شماره صیاد، کد ملی، موبایل و سررسید الزامی است"
    />

    <div class="hy-surface p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">نوع چک</label>
        <Select
          v-model="form.kind"
          :options="kindOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          @change="form.partyId = null"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">طرف‌حساب</label>
        <Select
          v-model="form.partyId"
          :options="parties"
          option-label="name"
          option-value="id"
          filter
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1 md:col-span-2">
        <label class="text-sm text-[var(--hy-muted)]">شماره صیاد (۱۶ رقم)</label>
        <InputText v-latin-digits v-model="form.sayyadNumber" maxlength="16" dir="ltr" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">تاریخ صدور</label>
        <JalaliDatePicker v-model="form.issueJalali" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">تاریخ سررسید</label>
        <JalaliDatePicker v-model="form.dueJalali" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">کد ملی صادرکننده</label>
        <InputText v-latin-digits v-model="form.drawerNationalId" maxlength="10" dir="ltr" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">موبایل</label>
        <InputText v-latin-digits v-model="form.drawerMobile" maxlength="11" dir="ltr" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">بانک</label>
        <InputText v-model="form.bankName" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">شعبه (اختیاری)</label>
        <InputText v-latin-digits v-model="form.branchCode" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">مبلغ (ریال)</label>
        <InputNumber v-latin-digits v-model="form.amount" locale="fa-IR" :min="0" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">تاریخ ثبت سند</label>
        <JalaliDatePicker v-model="form.dateJalali" />
      </div>
      <div class="md:col-span-2 flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">شرح (اختیاری)</label>
        <InputText v-model="form.description" class="w-full" />
      </div>
      <Button
        label="ثبت چک و سند"
        icon="pi pi-check"
        class="min-h-11 md:col-span-2"
        :disabled="!canSave"
        :loading="saving"
        @click="save"
      />
    </div>
  </div>
</template>
