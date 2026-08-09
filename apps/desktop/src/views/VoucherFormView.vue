<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Button from "primevue/button";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import {
  CreateVoucherSchema,
  isBalanced,
  sumCredit,
  sumDebit,
  todayJalali,
  type Account,
} from "@hesabyar/shared";
import { createVoucher, fetchAccounts } from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { useIsMobileRef } from "@/composables/useViewport";

type DraftLine = {
  key: number;
  accountId: string | null;
  description: string;
  debit: number | null;
  credit: number | null;
};

const toast = useToast();
const router = useRouter();
const isMobile = useIsMobileRef();

const accounts = ref<Account[]>([]);
const saving = ref(false);
const form = reactive({
  dateJalali: todayJalali(),
  description: "",
});
let keySeq = 1;
const lines = ref<DraftLine[]>([
  { key: keySeq++, accountId: null, description: "", debit: null, credit: null },
  { key: keySeq++, accountId: null, description: "", debit: null, credit: null },
]);

const detailAccounts = computed(() =>
  accounts.value.filter((a) => a.level === "DETAIL" && a.isActive),
);

const accountOptions = computed(() =>
  detailAccounts.value.map((a) => ({
    label: `${a.code} — ${a.name}`,
    value: a.id,
  })),
);

const parsedLines = computed(() =>
  lines.value
    .filter((l) => l.accountId)
    .map((l) => ({
      accountId: l.accountId as string,
      description: l.description,
      debit: BigInt(Math.max(0, Math.trunc(l.debit ?? 0))),
      credit: BigInt(Math.max(0, Math.trunc(l.credit ?? 0))),
    })),
);

const totalDebit = computed(() => sumDebit(parsedLines.value));
const totalCredit = computed(() => sumCredit(parsedLines.value));
const balanced = computed(() => isBalanced(parsedLines.value));
const canSave = computed(() => {
  if (!form.description.trim() || !/^\d{4}\/\d{2}\/\d{2}$/.test(form.dateJalali)) {
    return false;
  }
  if (!balanced.value) return false;
  return lines.value.every(
    (l) =>
      l.accountId &&
      ((l.debit ?? 0) > 0) !== ((l.credit ?? 0) > 0) &&
      ((l.debit ?? 0) > 0 || (l.credit ?? 0) > 0),
  );
});

onMounted(async () => {
  try {
    accounts.value = await fetchAccounts();
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری حساب‌ها ناموفق بود",
      life: 4000,
    });
  }
});

function addLine(): void {
  lines.value.push({
    key: keySeq++,
    accountId: null,
    description: "",
    debit: null,
    credit: null,
  });
}

function removeLine(key: number): void {
  if (lines.value.length <= 2) return;
  lines.value = lines.value.filter((l) => l.key !== key);
}

function onDebitChange(line: DraftLine): void {
  if ((line.debit ?? 0) > 0) line.credit = null;
}

function onCreditChange(line: DraftLine): void {
  if ((line.credit ?? 0) > 0) line.debit = null;
}

async function save(): Promise<void> {
  try {
    const payload = CreateVoucherSchema.parse({
      dateJalali: form.dateJalali,
      description: form.description.trim(),
      lines: parsedLines.value,
    });
    saving.value = true;
    const created = await createVoucher(payload);
    toast.add({
      severity: "success",
      summary: "ثبت شد",
      detail: `سند ${created.number} ذخیره شد`,
      life: 3000,
    });
    await router.push("/vouchers");
  } catch (error: unknown) {
    const detail =
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? "ثبت سند ناموفق بود — تراز بودن را بررسی کنید";
    toast.add({
      severity: "error",
      summary: "خطا",
      detail,
      life: 4500,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div :class="isMobile ? 'hy-page-mobile space-y-4 p-4' : 'p-6 space-y-4'" dir="rtl">
    <Toast />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">سند حسابداری جدید</h1>
        <p class="text-slate-600 text-sm mt-1">
          جمع بدهکار باید برابر جمع بستانکار باشد
        </p>
      </div>
      <Button
        label="بازگشت"
        severity="secondary"
        text
        icon="pi pi-arrow-right"
        @click="router.push('/vouchers')"
      />
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="flex flex-col gap-2">
        <label class="text-sm text-slate-600">تاریخ شمسی (YYYY/MM/DD)</label>
        <InputText v-latin-digits v-model="form.dateJalali" placeholder="1403/05/15" class="w-full" />
      </div>
      <div class="flex flex-col gap-2">
        <label class="text-sm text-slate-600">شرح سند</label>
        <InputText v-model="form.description" class="w-full" />
      </div>
    </div>

    <div class="flex items-center gap-3">
      <Tag
        :value="balanced ? 'تراز است' : 'تراز نیست'"
        :severity="balanced ? 'success' : 'danger'"
        rounded
        class="text-base px-3 py-2"
        data-testid="balance-indicator"
      />
      <span class="text-sm text-slate-600">
        بدهکار: {{ formatMoneyFa(totalDebit.toString()) }} — بستانکار:
        {{ formatMoneyFa(totalCredit.toString()) }}
      </span>
    </div>

    <ul
      v-if="isMobile"
      class="list-none m-0 p-0 space-y-3"
    >
      <li
        v-for="line in lines"
        :key="line.key"
        class="hy-surface p-4 space-y-3"
      >
        <Select
          v-model="line.accountId"
          :options="accountOptions"
          option-label="label"
          option-value="value"
          filter
          placeholder="انتخاب حساب تفصیلی"
          class="w-full"
        />
        <InputText v-model="line.description" placeholder="شرح" class="w-full" />
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--hy-muted)]">بدهکار</label>
            <InputNumber v-latin-digits
              v-model="line.debit"
              :min="0"
              locale="fa-IR"
              class="w-full"
              @update:model-value="onDebitChange(line)"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--hy-muted)]">بستانکار</label>
            <InputNumber v-latin-digits
              v-model="line.credit"
              :min="0"
              locale="fa-IR"
              class="w-full"
              @update:model-value="onCreditChange(line)"
            />
          </div>
        </div>
        <Button
          icon="pi pi-trash"
          text
          rounded
          severity="danger"
          :disabled="lines.length <= 2"
          label="حذف ردیف"
          class="min-h-10"
          @click="removeLine(line.key)"
        />
      </li>
    </ul>

    <DataTable v-else :value="lines" class="text-sm">
      <Column header="حساب" style="min-width: 16rem">
        <template #body="{ data }">
          <Select
            v-model="data.accountId"
            :options="accountOptions"
            option-label="label"
            option-value="value"
            filter
            placeholder="انتخاب حساب تفصیلی"
            class="w-full"
          />
        </template>
      </Column>
      <Column header="شرح" style="min-width: 10rem">
        <template #body="{ data }">
          <InputText v-model="data.description" class="w-full" />
        </template>
      </Column>
      <Column header="بدهکار" style="width: 10rem">
        <template #body="{ data }">
          <InputNumber v-latin-digits
            v-model="data.debit"
            :min="0"
            locale="fa-IR"
            class="w-full"
            @update:model-value="onDebitChange(data)"
          />
        </template>
      </Column>
      <Column header="بستانکار" style="width: 10rem">
        <template #body="{ data }">
          <InputNumber v-latin-digits
            v-model="data.credit"
            :min="0"
            locale="fa-IR"
            class="w-full"
            @update:model-value="onCreditChange(data)"
          />
        </template>
      </Column>
      <Column header="" style="width: 4rem">
        <template #body="{ data }">
          <Button
            icon="pi pi-trash"
            text
            rounded
            severity="danger"
            :disabled="lines.length <= 2"
            @click="removeLine(data.key)"
          />
        </template>
      </Column>
    </DataTable>

    <div class="flex flex-wrap gap-2">
      <Button label="افزودن ردیف" icon="pi pi-plus" outlined @click="addLine" />
      <Button
        label="ثبت سند"
        icon="pi pi-check"
        :disabled="!canSave || saving"
        :loading="saving"
        @click="save"
      />
    </div>
  </div>
</template>
