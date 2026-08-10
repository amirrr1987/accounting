<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
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
import { apiErrorMessage } from "@/lib/api-error";
import { usePageCopy } from "@/composables/usePageCopy";
import PageHeader from "@/components/PageHeader.vue";
import MobileStepWizard from "@/components/MobileStepWizard.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import { ux } from "@/locale/ux-copy";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { copy: pageCopy } = usePageCopy("invoices");

const original = ref<Invoice | null>(null);
const mode = ref<"wizard" | "preview">("wizard");
const wizardStep = ref(0);
const preview = ref<InvoiceVoucherPreview | null>(null);
const loadingPreview = ref(false);
const saving = ref(false);

const form = reactive({
  dateJalali: todayJalali(),
  returnReason: "",
  description: "",
});

const returnQty = ref<Record<string, number | null>>({});

const wizardSteps = computed(() => [
  ux.returnWizard.stepReason,
  ux.returnWizard.stepItems,
  ux.returnWizard.stepReview,
]);

const canSubmit = computed(() => {
  if (!original.value || !form.returnReason.trim()) return false;
  return original.value.lines.some(
    (l) =>
      (returnQty.value[l.id] ?? 0) > 0 && (l.remainingQty ?? l.quantity) > 0,
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

const wizardCanNext = computed(() => {
  if (wizardStep.value === 0) return form.returnReason.trim().length > 0;
  if (wizardStep.value === 1) return canSubmit.value;
  if (wizardStep.value === 2) return draftInput.value !== null;
  return false;
});

const returnLines = computed(() =>
  (original.value?.lines ?? []).filter(
    (l) => (l.remainingQty ?? l.quantity) > 0,
  ),
);

function wizardNext(): void {
  if (wizardStep.value < wizardSteps.value.length - 1) wizardStep.value += 1;
}

function wizardBack(): void {
  if (wizardStep.value > 0) wizardStep.value -= 1;
}

async function goPreview(): Promise<void> {
  if (!draftInput.value) return;
  loadingPreview.value = true;
  try {
    preview.value = await previewReturnInvoice(draftInput.value);
    mode.value = "preview";
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.invoices.title,
      detail: apiErrorMessage(err, ux.returnWizard.previewError),
      life: 6000,
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
      summary: ux.returnWizard.saved,
      detail: inv.number,
      life: 3500,
    });
    await router.push(`/invoices/${inv.id}`);
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.invoices.title,
      detail: apiErrorMessage(err, ux.returnWizard.saveError),
      life: 6000,
    });
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    const inv = await fetchInvoice(route.params.id as string);
    if (inv.deletedAt || isReturnKind(inv.kind)) {
      toast.add({
        severity: "error",
        summary: ux.invoices.title,
        detail: ux.returnWizard.notReturnable,
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
      summary: ux.invoices.title,
      detail: "بارگذاری فاکتور ناموفق بود",
      life: 4000,
    });
  }
});
</script>

<template>
  <div class="hy-page-mobile space-y-4" dir="rtl">
    <Toast />

    <PageHeader
      v-if="mode === 'wizard' && original"
      :title="ux.returnWizard.stepReason"
      :subtitle="`${original.number} — ${original.partyName}`"
      :hint="pageCopy.hint"
    >
      <template #actions>
        <Button
          icon="pi pi-times"
          text
          rounded
          class="hy-touch"
          @click="router.push(`/invoices/${route.params.id}`)"
        />
      </template>
    </PageHeader>

    <MobileStepWizard
      v-if="mode === 'wizard' && original"
      :steps="wizardSteps"
      :step="wizardStep"
      :can-next="wizardCanNext"
      :loading="loadingPreview"
      :finish-label="ux.returnWizard.previewCta"
      @back="wizardBack"
      @next="wizardNext"
      @finish="goPreview"
    >
      <div v-if="wizardStep === 0" class="hy-surface p-4 space-y-4">
        <JalaliDatePicker v-model="form.dateJalali" label="تاریخ مرجوعی" />
        <div class="flex flex-col gap-1">
          <label class="text-sm text-[var(--hy-muted)]">
            {{ ux.returnWizard.reasonLabel }}
          </label>
          <InputText
            v-model="form.returnReason"
            :placeholder="ux.returnWizard.reasonPlaceholder"
            class="w-full min-h-11"
          />
        </div>
        <InputText
          v-model="form.description"
          :placeholder="ux.returnWizard.descriptionOptional"
          class="w-full min-h-11"
        />
      </div>

      <div v-else-if="wizardStep === 1" class="space-y-3">
        <div
          v-for="line in returnLines"
          :key="line.id"
          class="hy-surface p-4 space-y-2"
        >
          <p class="font-semibold m-0">{{ line.productName }}</p>
          <p class="text-sm text-[var(--hy-muted)] m-0">
            {{ ux.returnWizard.remaining }}:
            {{ line.remainingQty ?? line.quantity }}
          </p>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--hy-muted)]">
              {{ ux.returnWizard.qtyLabel }}
            </label>
            <InputNumber v-latin-digits
              v-model="returnQty[line.id]"
              :min="0"
              :max="line.remainingQty ?? line.quantity"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <div v-else class="hy-surface p-4 space-y-3">
        <p class="m-0 text-sm">
          <span class="text-[var(--hy-muted)]">دلیل:</span>
          {{ form.returnReason }}
        </p>
        <ul class="list-none m-0 p-0 space-y-2 text-sm">
          <li
            v-for="line in returnLines.filter((l) => (returnQty[l.id] ?? 0) > 0)"
            :key="line.id"
          >
            {{ line.productName }} × {{ returnQty[line.id] }}
          </li>
        </ul>
      </div>
    </MobileStepWizard>

    <div v-else-if="preview && original" class="space-y-4">
      <header>
        <h1 class="text-xl font-bold m-0">{{ ux.returnWizard.previewTitle }}</h1>
        <p class="text-sm text-[var(--hy-muted)] mt-1">
          {{ ux.returnWizard.previewHint }}
        </p>
      </header>

      <div class="hy-surface p-4 space-y-2 text-sm">
        <Tag
          :value="
            original.kind === 'SALE'
              ? INVOICE_KIND_LABELS.SALE_RETURN
              : INVOICE_KIND_LABELS.PURCHASE_RETURN
          "
          severity="warn"
        />
        <p class="m-0 font-bold text-lg">
          {{ formatMoneyFa(preview.total) }}
        </p>
        <p class="m-0 text-[var(--hy-muted)]">{{ preview.description }}</p>
      </div>

      <div class="flex gap-2">
        <Button
          :label="ux.common.cancel"
          outlined
          class="min-h-12 flex-1"
          @click="mode = 'wizard'"
        />
        <Button
          :label="ux.returnWizard.confirmSave"
          icon="pi pi-check"
          class="min-h-12 flex-1"
          :loading="saving"
          @click="confirmSave"
        />
      </div>
    </div>
  </div>
</template>
