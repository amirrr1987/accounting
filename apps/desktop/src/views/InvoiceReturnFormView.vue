<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Button from "primevue/button";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import {
  INVOICE_KIND_LABELS,
  isReturnKind,
  todayJalali,
  type CreateReturnInvoiceInput,
  type Invoice,
  type InvoiceVoucherPreview,
} from "@hesabyar/shared";
import {
  createReturnInvoice,
  fetchInvoice,
  previewReturnInvoice,
} from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const original = ref<Invoice | null>(null);
const step = ref<"form" | "preview">("form");
const preview = ref<InvoiceVoucherPreview | null>(null);
const loading = ref(true);
const loadingPreview = ref(false);
const saving = ref(false);

const form = reactive({
  dateJalali: todayJalali(),
  returnReason: "",
  description: "",
});

const returnQty = ref<Record<string, number | null>>({});

const canSubmit = computed(() => {
  if (!original.value || !form.returnReason.trim()) return false;
  return original.value.lines.some(
    (l) => (returnQty.value[l.id] ?? 0) > 0 && (l.remainingQty ?? l.quantity) > 0,
  );
});

const draftInput = computed((): CreateReturnInvoiceInput | null => {
  if (!original.value || !form.returnReason.trim()) return null;
  const lines = original.value.lines
    .filter((l) => {
      const qty = returnQty.value[l.id] ?? 0;
      const max = l.remainingQty ?? l.quantity;
      return qty > 0 && qty <= max;
    })
    .map((l) => ({
      sourceLineId: l.id,
      quantity: Math.trunc(returnQty.value[l.id] as number),
    }));
  if (lines.length === 0) return null;
  return {
    originalInvoiceId: original.value.id,
    dateJalali: form.dateJalali,
    returnReason: form.returnReason.trim(),
    description: form.description,
    lines,
  };
});

onMounted(async () => {
  try {
    const inv = await fetchInvoice(route.params.id as string);
    if (inv.deletedAt || isReturnKind(inv.kind)) {
      toast.add({
        severity: "error",
        summary: "خطا",
        detail: "این فاکتور قابل مرجوعی نیست",
        life: 4000,
      });
      await router.push("/invoices");
      return;
    }
    original.value = inv;
    for (const line of inv.lines) {
      returnQty.value[line.id] = 0;
    }
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری فاکتور ناموفق بود",
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
});

async function goPreview(): Promise<void> {
  if (!draftInput.value) return;
  loadingPreview.value = true;
  try {
    preview.value = await previewReturnInvoice(draftInput.value);
    step.value = "preview";
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: err instanceof Error ? err.message : "پیش‌نمایش ناموفق بود",
      life: 4000,
    });
  } finally {
    loadingPreview.value = false;
  }
}

async function confirmSave(): Promise<void> {
  if (!draftInput.value) return;
  saving.value = true;
  try {
    const inv = await createReturnInvoice(draftInput.value);
    toast.add({
      severity: "success",
      summary: "ثبت شد",
      detail: inv.number,
      life: 3500,
    });
    await router.push(`/invoices/${inv.id}`);
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "ثبت مرجوعی ناموفق بود",
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="p-6 space-y-4 max-w-5xl mx-auto" dir="rtl">
    <Toast />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">
          {{ step === "form" ? "ثبت مرجوعی" : "پیش‌نمایش سند مرجوعی" }}
        </h1>
        <p v-if="original" class="text-sm text-slate-600 mt-1">
          مبدأ: {{ original.number }} — {{ original.partyName }}
        </p>
      </div>
      <Button
        label="بازگشت"
        icon="pi pi-arrow-right"
        text
        @click="
          step === 'preview'
            ? (step = 'form')
            : router.push(`/invoices/${route.params.id}`)
        "
      />
    </div>

    <template v-if="original && step === 'form'">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <JalaliDatePicker v-model="form.dateJalali" label="تاریخ مرجوعی" />
        <div class="flex flex-col gap-1 md:col-span-2">
          <label class="text-sm text-slate-600">دلیل مرجوعی *</label>
          <InputText
            v-model="form.returnReason"
            placeholder="مثلاً: کالای معیوب، اشتباه در سفارش، …"
          />
        </div>
        <div class="flex flex-col gap-1 md:col-span-2">
          <label class="text-sm text-slate-600">شرح تکمیلی</label>
          <InputText v-model="form.description" />
        </div>
      </div>

      <DataTable :value="original.lines" class="text-sm">
        <Column field="productName" header="کالا" />
        <Column header="تعداد فاکتور">
          <template #body="{ data }">{{ data.quantity }}</template>
        </Column>
        <Column header="مرجوع‌شده">
          <template #body="{ data }">{{ data.returnedQty ?? 0 }}</template>
        </Column>
        <Column header="باقیمانده">
          <template #body="{ data }">
            {{ data.remainingQty ?? data.quantity }}
          </template>
        </Column>
        <Column header="تعداد مرجوعی" style="width: 9rem">
          <template #body="{ data }">
            <InputNumber
              v-model="returnQty[data.id]"
              :min="0"
              :max="data.remainingQty ?? data.quantity"
              class="w-full"
            />
          </template>
        </Column>
      </DataTable>

      <div class="flex justify-end">
        <Button
          label="پیش‌نمایش سند"
          icon="pi pi-eye"
          :disabled="!canSubmit"
          :loading="loadingPreview"
          @click="goPreview"
        />
      </div>
    </template>

    <template v-else-if="preview && original">
      <div class="flex flex-wrap gap-3 items-center">
        <Tag
          :value="
            original.kind === 'SALE'
              ? INVOICE_KIND_LABELS.SALE_RETURN
              : INVOICE_KIND_LABELS.PURCHASE_RETURN
          "
          severity="warn"
        />
        <span class="text-sm text-slate-600">{{ preview.description }}</span>
      </div>

      <div class="flex flex-wrap gap-4 text-sm bg-slate-50 p-3 rounded">
        <span>جمع: {{ formatMoneyFa(preview.total) }}</span>
      </div>

      <DataTable :value="preview.lines" class="text-sm">
        <Column header="حساب">
          <template #body="{ data }">
            {{ data.accountCode }} — {{ data.accountName }}
          </template>
        </Column>
        <Column header="بدهکار">
          <template #body="{ data }">
            {{ data.debit === "0" ? "—" : formatMoneyFa(data.debit) }}
          </template>
        </Column>
        <Column header="بستانکار">
          <template #body="{ data }">
            {{ data.credit === "0" ? "—" : formatMoneyFa(data.credit) }}
          </template>
        </Column>
      </DataTable>

      <div class="flex justify-end gap-2">
        <Button label="ویرایش" outlined @click="step = 'form'" />
        <Button
          label="تأیید و ثبت"
          icon="pi pi-check"
          :loading="saving"
          @click="confirmSave"
        />
      </div>
    </template>
  </div>
</template>
