<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Select from "primevue/select";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
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
} from "@hesabyar/shared";
import {
  createInvoice,
  fetchParties,
  fetchProducts,
  previewInvoice,
} from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { usePageCopy } from "@/composables/usePageCopy";
import PageHeader from "@/components/PageHeader.vue";
import MobileStepWizard from "@/components/MobileStepWizard.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import { ux } from "@/locale/ux-copy";

type FlowKind = "SALE" | "PURCHASE";

type DraftLine = {
  key: number;
  productId: string | null;
  quantity: number | null;
  unitPrice: number | null;
  vatRatePercent: number | null;
  discountAmount: number | null;
};

const toast = useToast();
const router = useRouter();
const route = useRoute();
const { copy: pageCopy } = usePageCopy("invoices");

const parties = ref<Party[]>([]);
const products = ref<Product[]>([]);
const wizardStep = ref(0);
const mode = ref<"wizard" | "preview">("wizard");
const preview = ref<InvoiceVoucherPreview | null>(null);
const loadingPreview = ref(false);
const saving = ref(false);

const form = reactive({
  kind: "SALE" as FlowKind,
  partyId: null as string | null,
  dateJalali: todayJalali(),
  description: "",
  headerDiscount: 0 as number | null,
});

let keySeq = 1;
const lines = ref<DraftLine[]>([
  {
    key: keySeq++,
    productId: null,
    quantity: 1,
    unitPrice: null,
    vatRatePercent: 9,
    discountAmount: 0,
  },
]);

const kindOptions = [
  { label: ux.invoiceWizard.sale, value: "SALE" as const },
  { label: ux.invoiceWizard.purchase, value: "PURCHASE" as const },
];

const wizardSteps = computed(() => [
  ux.invoiceWizard.stepKind,
  ux.invoiceWizard.stepParty,
  ux.invoiceWizard.stepItems,
  ux.invoiceWizard.stepReview,
]);

const filteredParties = computed(() => {
  const want = form.kind === "SALE" ? "CUSTOMER" : "SUPPLIER";
  return parties.value.filter((p) => p.isActive && p.kind === want);
});

const productOptions = computed(() =>
  products.value
    .filter((p) => p.isActive)
    .map((p) => ({ label: p.name, value: p.id, product: p })),
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
    commissionAmount: 0n,
    commissionRate: null,
    lines: validLines.map((l) => {
      const product = products.value.find((p) => p.id === l.productId);
      return {
        productId: l.productId as string,
        quantity: Math.trunc(l.quantity as number),
        unitPrice: BigInt(Math.trunc(l.unitPrice as number)),
        vatRate: Math.max(0, Math.min(1, (l.vatRatePercent as number) / 100)),
        discountAmount: BigInt(Math.max(0, Math.trunc(l.discountAmount ?? 0))),
        unitId: product?.defaultUnitId ?? null,
      };
    }),
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
        message: ux.invoiceWizard.stockWarning(product.name, product.stockQty),
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
        message: ux.invoiceWizard.belowCostWarning(product.name),
        lossAmount: loss.toString(),
      });
    }
  });
  return warnings;
});

const hasStockError = computed(() =>
  saleWarnings.value.some((w) => w.type === "INSUFFICIENT_STOCK"),
);

const wizardCanNext = computed(() => {
  if (wizardStep.value === 0) return true;
  if (wizardStep.value === 1) return Boolean(form.partyId);
  if (wizardStep.value === 2) {
    return lines.value.some(
      (l) => l.productId && (l.quantity ?? 0) > 0 && (l.unitPrice ?? 0) > 0,
    );
  }
  if (wizardStep.value === 3) {
    return draftInput.value !== null && !hasStockError.value;
  }
  return false;
});

const partyName = computed(
  () => parties.value.find((p) => p.id === form.partyId)?.name ?? "—",
);

function onProductChange(line: DraftLine): void {
  const p = products.value.find((x) => x.id === line.productId);
  if (!p) return;
  line.unitPrice = Number(p.unitPrice);
  line.vatRatePercent = Math.round(p.vatRate * 1000) / 10;
}

function addLine(): void {
  lines.value.push({
    key: keySeq++,
    productId: null,
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

function pickKind(kind: FlowKind): void {
  form.kind = kind;
  form.partyId = null;
}

async function goPreview(): Promise<void> {
  if (!draftInput.value) return;
  loadingPreview.value = true;
  try {
    preview.value = await previewInvoice(draftInput.value);
    mode.value = "preview";
  } catch (err) {
    toast.add({
      severity: "error",
      summary: ux.invoices.title,
      detail:
        err instanceof Error && err.message
          ? err.message
          : ux.invoiceWizard.previewError,
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
      summary: ux.invoiceWizard.saved,
      detail: inv.number,
      life: 3500,
    });
    await router.push("/invoices");
  } catch {
    toast.add({
      severity: "error",
      summary: ux.invoices.title,
      detail: ux.invoiceWizard.saveError,
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}

function wizardFinish(): void {
  void goPreview();
}

function wizardNext(): void {
  if (wizardStep.value < wizardSteps.value.length - 1) {
    wizardStep.value += 1;
  }
}

function wizardBack(): void {
  if (wizardStep.value > 0) wizardStep.value -= 1;
}

onMounted(async () => {
  const q = route.query.kind;
  if (q === "SALE" || q === "PURCHASE") {
    form.kind = q;
    wizardStep.value = 1;
  }
  try {
    const [p, prod] = await Promise.all([fetchParties(), fetchProducts()]);
    parties.value = p;
    products.value = prod;
  } catch {
    toast.add({
      severity: "error",
      summary: ux.invoices.title,
      detail: ux.invoices.loadError,
      life: 4000,
    });
  }
});
</script>

<template>
  <div class="hy-page-mobile space-y-4" dir="rtl">
    <Toast />

    <PageHeader
      v-if="mode === 'wizard'"
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
          @click="router.push('/invoices')"
        />
      </template>
    </PageHeader>

    <MobileStepWizard
      v-if="mode === 'wizard'"
      :steps="wizardSteps"
      :step="wizardStep"
      :can-next="wizardCanNext"
      :loading="loadingPreview"
      :finish-label="ux.invoiceWizard.previewCta"
      @back="wizardBack"
      @next="wizardNext"
      @finish="wizardFinish"
    >
      <div v-if="wizardStep === 0" class="grid grid-cols-1 gap-3">
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

      <div v-else-if="wizardStep === 1" class="hy-surface p-4 space-y-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm text-[var(--hy-muted)]">
            {{
              form.kind === "SALE"
                ? ux.invoiceWizard.customer
                : ux.invoiceWizard.supplier
            }}
          </label>
          <Select
            v-model="form.partyId"
            :options="filteredParties"
            option-label="name"
            option-value="id"
            filter
            placeholder="انتخاب…"
            class="w-full"
          />
        </div>
        <JalaliDatePicker v-model="form.dateJalali" />
        <InputText
          v-model="form.description"
          :placeholder="ux.invoiceWizard.descriptionOptional"
          class="w-full min-h-11"
        />
      </div>

      <div v-else-if="wizardStep === 2" class="space-y-3">
        <div
          v-for="line in lines"
          :key="line.key"
          class="hy-surface p-4 space-y-3"
        >
          <Select
            v-model="line.productId"
            :options="productOptions"
            option-label="label"
            option-value="value"
            filter
            placeholder="کالا…"
            class="w-full"
            @change="onProductChange(line)"
          />
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-[var(--hy-muted)]">تعداد</label>
              <InputNumber v-latin-digits
                v-model="line.quantity"
                :min="1"
                class="w-full"
              />
            </div>
            <div>
              <label class="text-xs text-[var(--hy-muted)]">
                قیمت (ریال)
              </label>
              <InputNumber v-latin-digits
                v-model="line.unitPrice"
                :min="0"
                class="w-full"
              />
            </div>
          </div>
          <Button
            v-if="lines.length > 1"
            label="حذف ردیف"
            text
            severity="danger"
            size="small"
            @click="removeLine(line.key)"
          />
        </div>
        <Button
          :label="ux.invoiceWizard.addLine"
          icon="pi pi-plus"
          outlined
          class="w-full min-h-11"
          @click="addLine"
        />
      </div>

      <div v-else class="hy-surface p-4 space-y-3">
        <Tag
          :value="form.kind === 'SALE' ? ux.invoiceWizard.sale : ux.invoiceWizard.purchase"
          severity="info"
        />
        <p class="m-0 text-sm">
          <span class="text-[var(--hy-muted)]">{{ ux.invoiceWizard.summaryParty }}:</span>
          {{ partyName }}
        </p>
        <p class="m-0 text-sm">
          <span class="text-[var(--hy-muted)]">{{ ux.invoiceWizard.summaryDate }}:</span>
          {{ form.dateJalali }}
        </p>
        <ul class="list-none m-0 p-0 space-y-2 text-sm">
          <li
            v-for="line in lines.filter((l) => l.productId)"
            :key="line.key"
          >
            {{
              productOptions.find((p) => p.value === line.productId)?.label
            }}
            × {{ line.quantity }} —
            {{ formatMoneyFa((line.unitPrice ?? 0) * (line.quantity ?? 0)) }}
          </li>
        </ul>
        <div
          v-if="clientTotals"
          class="pt-3 border-t border-[var(--hy-border)] space-y-1"
        >
          <p class="m-0 font-bold text-lg">
            {{ ux.invoiceWizard.total }}:
            {{ formatMoneyFa(clientTotals.total) }}
          </p>
        </div>
        <Message
          v-for="(w, i) in saleWarnings"
          :key="i"
          :severity="w.type === 'INSUFFICIENT_STOCK' ? 'error' : 'warn'"
          :closable="false"
        >
          {{ w.message }}
        </Message>
      </div>
    </MobileStepWizard>

    <div v-else-if="preview" class="space-y-4">
      <header>
        <h1 class="text-xl font-bold m-0">{{ ux.invoiceWizard.previewTitle }}</h1>
        <p class="text-sm text-[var(--hy-muted)] mt-1">
          {{ ux.invoiceWizard.previewHint }}
        </p>
      </header>

      <div class="hy-surface p-4 space-y-2 text-sm">
        <p class="m-0 font-bold text-lg">
          {{ ux.invoiceWizard.total }}: {{ formatMoneyFa(preview.total) }}
        </p>
        <p class="m-0 text-[var(--hy-muted)]">
          {{ preview.description }}
        </p>
        <p
          class="m-0"
          :class="
            preview.totalDebit === preview.totalCredit
              ? 'text-[var(--hy-accent)]'
              : 'text-[var(--hy-danger)]'
          "
        >
          {{ ux.invoiceWizard.balanceOk }}:
          {{ formatMoneyFa(preview.totalDebit) }}
        </p>
      </div>

      <div class="flex gap-2">
        <Button
          :label="ux.common.cancel"
          outlined
          class="min-h-12 flex-1"
          @click="mode = 'wizard'"
        />
        <Button
          :label="ux.invoiceWizard.confirmSave"
          icon="pi pi-check"
          class="min-h-12 flex-1"
          :loading="saving"
          :disabled="preview.totalDebit !== preview.totalCredit"
          @click="confirmSave"
        />
      </div>
    </div>
  </div>
</template>
