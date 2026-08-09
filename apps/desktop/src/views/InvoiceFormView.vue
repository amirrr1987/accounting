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
import Message from "primevue/message";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import {
  calcInvoiceTotals,
  calcLineSaleLoss,
  todayJalali,
  type CreateInvoiceInput,
  type InvoicePreviewWarning,
  type InvoiceVoucherPreview,
  type Party,
  type Product,
  type UnitOfMeasure,
} from "@hesabyar/shared";
import {
  createInvoice,
  fetchParties,
  fetchProducts,
  fetchUnits,
  previewInvoice,
} from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { useIsMobileRef } from "@/composables/useViewport";
import InvoiceFormMobile from "@/views/invoice/InvoiceFormMobile.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";

const isMobile = useIsMobileRef();

type DraftLine = {
  key: number;
  productId: string | null;
  unitId: string | null;
  quantity: number | null;
  unitPrice: number | null;
  vatRatePercent: number | null;
  discountAmount: number | null;
};

const toast = useToast();
const router = useRouter();

const parties = ref<Party[]>([]);
const products = ref<Product[]>([]);
const units = ref<UnitOfMeasure[]>([]);
const step = ref<"form" | "preview">("form");
const preview = ref<InvoiceVoucherPreview | null>(null);
const loadingPreview = ref(false);
const saving = ref(false);

const form = reactive({
  kind: "SALE" as "SALE" | "PURCHASE",
  partyId: null as string | null,
  dateJalali: todayJalali(),
  description: "",
  headerDiscount: 0 as number | null,
  commissionAmount: 0 as number | null,
  commissionRatePercent: null as number | null,
});

let keySeq = 1;
const lines = ref<DraftLine[]>([
  {
    key: keySeq++,
    productId: null,
    unitId: null,
    quantity: 1,
    unitPrice: null,
    vatRatePercent: 9,
    discountAmount: 0,
  },
]);

const kindOptions = [
  { label: "فروش", value: "SALE" },
  { label: "خرید", value: "PURCHASE" },
];

const filteredParties = computed(() => {
  const want = form.kind === "SALE" ? "CUSTOMER" : "SUPPLIER";
  return parties.value
    .filter((p) => p.isActive && p.kind === want)
    .map((p) => ({ label: p.name, value: p.id }));
});

const productOptions = computed(() =>
  products.value
    .filter((p) => p.isActive)
    .map((p) => ({
      label: `${p.sku} — ${p.name}`,
      value: p.id,
      product: p,
    })),
);

const draftInput = computed((): CreateInvoiceInput | null => {
  if (!form.partyId || !/^\d{4}\/\d{2}\/\d{2}$/.test(form.dateJalali)) {
    return null;
  }
  const validLines = lines.value.filter(
    (l) =>
      l.productId &&
      (l.quantity ?? 0) > 0 &&
      (l.unitPrice ?? 0) > 0 &&
      l.vatRatePercent !== null,
  );
  if (validLines.length === 0) return null;
  return {
    kind: form.kind,
    partyId: form.partyId,
    dateJalali: form.dateJalali,
    description: form.description,
    headerDiscount: BigInt(Math.max(0, Math.trunc(form.headerDiscount ?? 0))),
    commissionAmount: BigInt(Math.max(0, Math.trunc(form.commissionAmount ?? 0))),
    commissionRate:
      form.commissionRatePercent !== null
        ? Math.max(0, Math.min(1, form.commissionRatePercent / 100))
        : null,
    lines: validLines.map((l) => ({
      productId: l.productId as string,
      quantity: Math.trunc(l.quantity as number),
      unitPrice: BigInt(Math.trunc(l.unitPrice as number)),
      vatRate: Math.max(0, Math.min(1, (l.vatRatePercent as number) / 100)),
      discountAmount: BigInt(Math.max(0, Math.trunc(l.discountAmount ?? 0))),
      unitId: l.unitId,
    })),
  };
});

const clientTotals = computed(() => {
  if (!draftInput.value) return null;
  return calcInvoiceTotals(
    draftInput.value.lines,
    draftInput.value.headerDiscount ?? 0n,
  );
});

const saleWarnings = computed((): InvoicePreviewWarning[] => {
  if (form.kind !== "SALE" || !draftInput.value) return [];

  const warnings: InvoicePreviewWarning[] = [];
  draftInput.value.lines.forEach((line, lineIndex) => {
    const product = products.value.find((p) => p.id === line.productId);
    if (!product) return;

    if (line.quantity > product.stockQty) {
      warnings.push({
        type: "INSUFFICIENT_STOCK",
        lineIndex,
        productName: product.name,
        message: `موجودی ${product.name} (${product.stockQty}) کمتر از ${line.quantity} است`,
      });
      return;
    }

    const loss = calcLineSaleLoss(
      line.quantity,
      line.unitPrice,
      BigInt(product.costPrice),
      line.discountAmount ?? 0n,
    );
    if (loss > 0n) {
      warnings.push({
        type: "BELOW_COST",
        lineIndex,
        productName: product.name,
        message: `فروش ${product.name} زیر بهای تمام‌شده (${formatMoneyFa(product.costPrice)} ریال)`,
        lossAmount: loss.toString(),
      });
    }
  });
  return warnings;
});

const hasStockError = computed(() =>
  saleWarnings.value.some((w) => w.type === "INSUFFICIENT_STOCK"),
);

const belowCostLossTotal = computed(() =>
  saleWarnings.value
    .filter((w) => w.type === "BELOW_COST" && w.lossAmount)
    .reduce((sum, w) => sum + BigInt(w.lossAmount ?? "0"), 0n),
);

function productStockLabel(productId: string | null): string | null {
  const product = products.value.find((p) => p.id === productId);
  if (!product) return null;
  return `موجودی: ${product.stockQty.toLocaleString("fa-IR")}`;
}

const canPreview = computed(
  () => draftInput.value !== null && !hasStockError.value,
);

onMounted(async () => {
  try {
    const [p, prod, u] = await Promise.all([
      fetchParties(),
      fetchProducts(),
      fetchUnits(),
    ]);
    parties.value = p;
    products.value = prod;
    units.value = u;
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری داده‌ها ناموفق بود",
      life: 4000,
    });
  }
});

function onKindChange(): void {
  form.partyId = null;
}

function onPartyChange(): void {
  const party = parties.value.find((p) => p.id === form.partyId);
  if (party?.commissionRate) {
    form.commissionRatePercent = Math.round(party.commissionRate * 1000) / 10;
  }
}

function onProductChange(line: DraftLine): void {
  const p = products.value.find((x) => x.id === line.productId);
  if (!p) return;
  line.unitPrice = Number(p.unitPrice);
  line.vatRatePercent = Math.round(p.vatRate * 1000) / 10;
  line.unitId = p.defaultUnitId;
}

function isFixedPrice(line: DraftLine): boolean {
  const p = products.value.find((x) => x.id === line.productId);
  return p?.pricingMode === "FIXED";
}

function addLine(): void {
  lines.value.push({
    key: keySeq++,
    productId: null,
    unitId: null,
    quantity: 1,
    unitPrice: null,
    vatRatePercent: 9,
    discountAmount: 0,
  });
}

function removeLine(key: number): void {
  if (lines.value.length <= 1) return;
  lines.value = lines.value.filter((l) => l.key !== key);
}

async function goPreview(): Promise<void> {
  if (!draftInput.value) return;
  loadingPreview.value = true;
  try {
    preview.value = await previewInvoice(draftInput.value);
    step.value = "preview";
  } catch (err) {
    const detail =
      err instanceof Error && err.message
        ? err.message
        : "پیش‌نمایش سند ناموفق بود";
    toast.add({
      severity: "error",
      summary: "خطا",
      detail,
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
    const inv = await createInvoice(draftInput.value);
    toast.add({
      severity: "success",
      summary: "ثبت شد",
      detail: `${inv.number} / سند ${inv.voucherNumber}`,
      life: 3500,
    });
    await router.push("/invoices");
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "ثبت فاکتور ناموفق بود",
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <InvoiceFormMobile v-if="isMobile" />

  <div v-else class="p-6 space-y-4 max-w-5xl mx-auto" dir="rtl">
    <Toast />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">
          {{ step === "form" ? "فاکتور جدید" : "پیش‌نمایش سند" }}
        </h1>
        <p class="text-slate-600 text-sm mt-1">
          {{
            step === "form"
              ? "پس از تکمیل، سند حسابداری را پیش‌نمایش کنید"
              : "در صورت تأیید، فاکتور و سند به‌صورت اتمیک ثبت می‌شوند"
          }}
        </p>
      </div>
      <Button
        label="بازگشت"
        icon="pi pi-arrow-right"
        text
        @click="step === 'preview' ? (step = 'form') : router.push('/invoices')"
      />
    </div>

    <template v-if="step === 'form'">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm text-slate-600">نوع فاکتور</label>
          <Select
            v-model="form.kind"
            :options="kindOptions"
            option-label="label"
            option-value="value"
            @change="onKindChange"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-slate-600">طرف‌حساب</label>
          <Select
            v-model="form.partyId"
            :options="filteredParties"
            option-label="label"
            option-value="value"
            placeholder="انتخاب…"
            filter
            @change="onPartyChange"
          />
        </div>
        <div class="flex flex-col gap-1">
          <JalaliDatePicker v-model="form.dateJalali" label="تاریخ (جلالی)" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-slate-600">شرح</label>
          <InputText v-model="form.description" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-slate-600">تخفیف سر فاکتور (ریال)</label>
          <InputNumber v-latin-digits v-model="form.headerDiscount" :min="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-slate-600">پورسانت (ریال)</label>
          <InputNumber v-latin-digits v-model="form.commissionAmount" :min="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-slate-600">پورسانت (٪)</label>
          <InputNumber v-latin-digits
            v-model="form.commissionRatePercent"
            :min="0"
            :max="100"
            :max-fraction-digits="1"
            class="w-full"
          />
        </div>
      </div>

      <DataTable :value="lines" class="text-sm">
        <Column header="کالا">
          <template #body="{ data }">
            <div class="flex flex-col gap-1">
              <Select
                v-model="data.productId"
                :options="productOptions"
                option-label="label"
                option-value="value"
                placeholder="کالا…"
                filter
                class="w-full"
                @change="onProductChange(data)"
              />
              <span
                v-if="form.kind === 'SALE' && productStockLabel(data.productId)"
                class="text-xs text-slate-500"
              >
                {{ productStockLabel(data.productId) }}
              </span>
            </div>
          </template>
        </Column>
        <Column header="تعداد" style="width: 7rem">
          <template #body="{ data }">
            <InputNumber v-latin-digits v-model="data.quantity" :min="1" class="w-full" />
          </template>
        </Column>
        <Column header="واحد" style="width: 8rem">
          <template #body="{ data }">
            <Select
              v-model="data.unitId"
              :options="units.map((u) => ({ label: u.nameFa, value: u.id }))"
              option-label="label"
              option-value="value"
              placeholder="—"
              class="w-full"
            />
          </template>
        </Column>
        <Column header="قیمت واحد" style="width: 10rem">
          <template #body="{ data }">
            <InputNumber v-latin-digits
              v-model="data.unitPrice"
              :min="0"
              :disabled="isFixedPrice(data)"
              class="w-full"
            />
            <small
              v-if="isFixedPrice(data)"
              class="text-xs text-[var(--hy-muted)] block mt-1"
            >
              قیمت ثابت
            </small>
          </template>
        </Column>
        <Column header="مالیات ٪" style="width: 7rem">
          <template #body="{ data }">
            <InputNumber v-latin-digits
              v-model="data.vatRatePercent"
              :min="0"
              :max="100"
              :max-fraction-digits="1"
              class="w-full"
            />
          </template>
        </Column>
        <Column header="تخفیف ردیف" style="width: 9rem">
          <template #body="{ data }">
            <InputNumber v-latin-digits v-model="data.discountAmount" :min="0" class="w-full" />
          </template>
        </Column>
        <Column header="" style="width: 3rem">
          <template #body="{ data }">
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              @click="removeLine(data.key)"
            />
          </template>
        </Column>
      </DataTable>

      <div v-if="saleWarnings.length > 0" class="space-y-2">
        <Message
          v-for="(warning, index) in saleWarnings"
          :key="`${warning.type}-${warning.lineIndex}-${index}`"
          :severity="warning.type === 'INSUFFICIENT_STOCK' ? 'error' : 'warn'"
          :closable="false"
        >
          {{ warning.message }}
          <span v-if="warning.lossAmount">
            — زیان: {{ formatMoneyFa(warning.lossAmount) }} ریال
          </span>
        </Message>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <Button label="ردیف جدید" icon="pi pi-plus" outlined @click="addLine" />
        <div v-if="clientTotals" class="flex flex-wrap gap-4 text-sm">
          <span>خالص: {{ formatMoneyFa(clientTotals.subtotal) }}</span>
          <span>مالیات: {{ formatMoneyFa(clientTotals.vatAmount) }}</span>
          <span v-if="clientTotals.headerDiscount > 0n">
            تخفیف: {{ formatMoneyFa(clientTotals.headerDiscount) }}
          </span>
          <span v-if="belowCostLossTotal > 0n" class="text-amber-700">
            زیان زیر بهای تمام‌شده: {{ formatMoneyFa(belowCostLossTotal) }}
          </span>
          <span class="font-bold">جمع: {{ formatMoneyFa(clientTotals.total) }}</span>
        </div>
        <Button
          label="پیش‌نمایش سند"
          icon="pi pi-eye"
          :disabled="!canPreview"
          :loading="loadingPreview"
          @click="goPreview"
        />
      </div>
    </template>

    <template v-else-if="preview">
      <div class="flex flex-wrap gap-3 items-center">
        <Tag
          :value="form.kind === 'SALE' ? 'فروش' : 'خرید'"
          severity="info"
        />
        <span class="text-sm text-slate-600">{{ preview.description }}</span>
      </div>

      <div class="flex flex-wrap gap-4 text-sm bg-slate-50 p-3 rounded">
        <span>خالص: {{ formatMoneyFa(preview.subtotal) }}</span>
        <span>مالیات: {{ formatMoneyFa(preview.vatAmount) }}</span>
        <span v-if="preview.headerDiscount !== '0'">
          تخفیف: {{ formatMoneyFa(preview.headerDiscount) }}
        </span>
        <span v-if="preview.commissionAmount !== '0'">
          پورسانت: {{ formatMoneyFa(preview.commissionAmount) }}
        </span>
        <span v-if="form.kind === 'SALE' && preview.cogsTotal !== '0'">
          بهای تمام‌شده: {{ formatMoneyFa(preview.cogsTotal) }}
        </span>
        <span
          v-if="form.kind === 'SALE' && preview.lossTotal !== '0'"
          class="text-amber-700"
        >
          زیان زیر بهای تمام‌شده: {{ formatMoneyFa(preview.lossTotal) }}
        </span>
        <span class="font-bold">جمع: {{ formatMoneyFa(preview.total) }}</span>
      </div>

      <div v-if="preview.warnings.length > 0" class="space-y-2">
        <Message
          v-for="(warning, index) in preview.warnings"
          :key="`preview-${warning.type}-${warning.lineIndex}-${index}`"
          :severity="warning.type === 'INSUFFICIENT_STOCK' ? 'error' : 'warn'"
          :closable="false"
        >
          {{ warning.message }}
          <span v-if="warning.lossAmount">
            — زیان: {{ formatMoneyFa(warning.lossAmount) }} ریال
          </span>
        </Message>
      </div>

      <DataTable :value="preview.lines" class="text-sm">
        <Column header="حساب">
          <template #body="{ data }">
            {{ data.accountCode }} — {{ data.accountName }}
          </template>
        </Column>
        <Column field="description" header="شرح" />
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

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm">
          <span
            :class="
              preview.totalDebit === preview.totalCredit
                ? 'text-emerald-700'
                : 'text-red-600'
            "
          >
            بدهکار {{ formatMoneyFa(preview.totalDebit) }} =
            بستانکار {{ formatMoneyFa(preview.totalCredit) }}
          </span>
        </div>
        <div class="flex gap-2">
          <Button label="ویرایش" outlined @click="step = 'form'" />
          <Button
            label="تأیید و ثبت"
            icon="pi pi-check"
            :loading="saving"
            :disabled="preview.totalDebit !== preview.totalCredit"
            @click="confirmSave"
          />
        </div>
      </div>
    </template>
  </div>
</template>
