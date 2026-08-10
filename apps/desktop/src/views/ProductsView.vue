<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import ConfirmDialog from "primevue/confirmdialog";
import { useConfirm } from "primevue/useconfirm";
import type { CreateProductInput, Product, ProductPricingMode, UnitOfMeasure } from "@hesabyar/shared";
import { PRODUCT_PRICING_MODE_LABELS } from "@hesabyar/shared";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  fetchUnits,
  updateProduct,
} from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { apiErrorMessage } from "@/lib/api-error";
import { usePageCopy } from "@/composables/usePageCopy";
import { ux } from "@/locale/ux-copy";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import MobileListCard from "@/components/MobileListCard.vue";

const toast = useToast();
const confirm = useConfirm();
const { copy: pageCopy, isMobile } = usePageCopy("products");
const products = ref<Product[]>([]);
const units = ref<UnitOfMeasure[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const editing = ref<Product | null>(null);

const form = reactive({
  sku: "",
  name: "",
  unitPrice: null as number | null,
  costPrice: null as number | null,
  stockQty: 0 as number | null,
  vatRatePercent: 9 as number | null,
  defaultUnitId: null as string | null,
  pricingMode: "AT_INVOICE" as ProductPricingMode,
});

const pricingModeOptions = Object.entries(PRODUCT_PRICING_MODE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    products.value = await fetchProducts();
    units.value = await fetchUnits();
  } catch {
    toast.add({
      severity: "error",
      summary: ux.products.title,
      detail: ux.products.loadError,
      life: 4500,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function openCreate(): void {
  editing.value = null;
  form.sku = "";
  form.name = "";
  form.unitPrice = null;
  form.costPrice = null;
  form.stockQty = 0;
  form.vatRatePercent = 9;
  form.defaultUnitId = null;
  form.pricingMode = "AT_INVOICE";
  dialogVisible.value = true;
}

function openEdit(row: Product): void {
  editing.value = row;
  form.sku = row.sku;
  form.name = row.name;
  form.unitPrice = Number(row.unitPrice);
  form.costPrice = Number(row.costPrice);
  form.stockQty = row.stockQty;
  form.vatRatePercent = Math.round(row.vatRate * 1000) / 10;
  form.defaultUnitId = row.defaultUnitId;
  form.pricingMode = row.pricingMode;
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  if (!form.sku.trim() || !form.name.trim() || !(form.unitPrice && form.unitPrice > 0)) {
    return;
  }
  saving.value = true;
  const payload: CreateProductInput = {
    sku: form.sku.trim(),
    name: form.name.trim(),
    unitPrice: BigInt(Math.trunc(form.unitPrice)),
    costPrice: BigInt(Math.trunc(form.costPrice ?? 0)),
    stockQty: Math.max(0, Math.trunc(form.stockQty ?? 0)),
    vatRate: Math.max(0, Math.min(1, (form.vatRatePercent ?? 0) / 100)),
    defaultUnitId: form.defaultUnitId,
    pricingMode: form.pricingMode,
    isActive: true,
  };
  try {
    if (editing.value) {
      await updateProduct(editing.value.id, payload);
      toast.add({
        severity: "success",
        summary: "ذخیره شد",
        detail: "کالا ویرایش شد",
        life: 2500,
      });
    } else {
      await createProduct(payload);
      toast.add({
        severity: "success",
        summary: "ایجاد شد",
        detail: "کالا افزوده شد",
        life: 2500,
      });
    }
    dialogVisible.value = false;
    await load();
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: apiErrorMessage(err, "ذخیره کالا ناموفق بود"),
      life: 6000,
    });
  } finally {
    saving.value = false;
  }
}

async function deactivate(row: Product): Promise<void> {
  confirm.require({
    message: `آیا از غیرفعال‌سازی «${row.name}» مطمئن هستید؟`,
    header: "تأیید غیرفعال‌سازی",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "غیرفعال",
    rejectLabel: "انصراف",
    acceptClass: "p-button-danger",
    accept: () => {
      void (async () => {
        try {
          await deleteProduct(row.id);
          toast.add({
            severity: "success",
            summary: "غیرفعال شد",
            detail: row.name,
            life: 2500,
          });
          await load();
        } catch (err: unknown) {
          toast.add({
            severity: "error",
            summary: "خطا",
            detail: apiErrorMessage(err, "غیرفعال‌سازی ناموفق بود"),
            life: 6000,
          });
        }
      })();
    },
  });
}
</script>

<template>
  <div :class="isMobile ? 'hy-page-mobile space-y-4' : 'hy-page'" dir="rtl">
    <Toast />
    <ConfirmDialog />

    <PageHeader
      :title="pageCopy.title"
      :subtitle="pageCopy.subtitle"
      :hint="pageCopy.hint"
    >
      <template #actions>
        <Button
          :label="ux.products.create"
          icon="pi pi-plus"
          class="min-h-11"
          @click="openCreate"
        />
      </template>
    </PageHeader>

    <div class="hy-surface overflow-hidden">
      <EmptyState
        v-if="!loading && products.length === 0"
        :title="ux.products.emptyTitle"
        :description="ux.products.emptyBody"
        icon="pi pi-box"
        :action-label="ux.products.emptyCta"
        @action="openCreate"
      />

      <ul
        v-else-if="isMobile"
        class="list-none m-0 p-0 space-y-2"
      >
        <li v-for="row in products" :key="row.id">
          <MobileListCard
            :title="row.name"
            :subtitle="row.sku"
            :meta="formatMoneyFa(row.unitPrice)"
            :meta-severity="row.isActive ? 'success' : 'secondary'"
            @click="openEdit(row)"
          />
        </li>
      </ul>

      <DataTable
        v-else
        :value="products"
        :loading="loading"
        paginator
        :rows="15"
        class="text-sm"
      >
      <Column field="sku" header="کد" />
      <Column field="name" header="نام" />
      <Column header="واحد">
        <template #body="{ data }">
          {{ data.defaultUnitNameFa ?? "—" }}
        </template>
      </Column>
      <Column header="قیمت واحد">
        <template #body="{ data }">
          {{ formatMoneyFa(data.unitPrice) }}
        </template>
      </Column>
      <Column :header="ux.products.stockQty">
        <template #body="{ data }">
          {{ data.stockQty }}
        </template>
      </Column>
      <Column :header="ux.products.costPrice">
        <template #body="{ data }">
          {{ formatMoneyFa(data.costPrice) }}
        </template>
      </Column>
      <Column header="مالیات">
        <template #body="{ data }">
          {{ Math.round(data.vatRate * 100) }}٪
        </template>
      </Column>
      <Column header="وضعیت">
        <template #body="{ data }">
          <Tag
            :value="data.isActive ? ux.common.active : ux.common.inactive"
            :severity="data.isActive ? 'success' : 'secondary'"
          />
        </template>
      </Column>
      <Column header="عملیات">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              icon="pi pi-pencil"
              text
              rounded
              class="hy-touch"
              :aria-label="ux.common.edit"
              @click="openEdit(data)"
            />
            <Button
              v-if="data.isActive"
              icon="pi pi-ban"
              text
              rounded
              class="hy-touch"
              severity="danger"
              aria-label="غیرفعال‌سازی"
              @click="deactivate(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="editing ? 'ویرایش کالا' : ux.products.create"
      class="w-full max-w-md"
    >
      <div class="flex flex-col gap-3 pt-2">
        <label class="text-sm text-[var(--hy-muted)]">کد کالا</label>
        <InputText v-model="form.sku" class="min-h-11" />
        <label class="text-sm text-[var(--hy-muted)]">نام</label>
        <InputText v-model="form.name" class="min-h-11" />
        <label class="text-sm text-[var(--hy-muted)]">قیمت واحد (ریال)</label>
        <InputNumber v-latin-digits v-model="form.unitPrice" :min="0" :use-grouping="true" class="w-full" />
        <label class="text-sm text-[var(--hy-muted)]">{{ ux.products.costPrice }} (ریال)</label>
        <InputNumber v-latin-digits v-model="form.costPrice" :min="0" :use-grouping="true" class="w-full" />
        <label class="text-sm text-[var(--hy-muted)]">{{ ux.products.stockQty }}</label>
        <InputNumber
          v-latin-digits
          v-model="form.stockQty"
          :min="0"
          class="w-full"
          :disabled="Boolean(editing)"
          :placeholder="editing ? 'فقط از فاکتور/تعدیل وزن' : undefined"
        />
        <small v-if="editing" class="text-[var(--hy-muted)]">
          موجودی در ویرایش تغییر نمی‌کند؛ از فاکتور یا تعدیل وزن استفاده کنید.
        </small>
        <label class="text-sm text-[var(--hy-muted)]">نرخ مالیات (٪)</label>
        <InputNumber v-latin-digits
          v-model="form.vatRatePercent"
          :min="0"
          :max="100"
          :min-fraction-digits="0"
          :max-fraction-digits="1"
          class="w-full"
        />
        <label class="text-sm text-[var(--hy-muted)]">سیاست قیمت</label>
        <Select
          v-model="form.pricingMode"
          :options="pricingModeOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
        <label class="text-sm text-[var(--hy-muted)]">واحد اندازه‌گیری</label>
        <Select
          v-model="form.defaultUnitId"
          :options="units.map((u) => ({ label: u.nameFa, value: u.id }))"
          option-label="label"
          option-value="value"
          placeholder="انتخاب واحد…"
          class="w-full"
        />
      </div>
      <template #footer>
        <Button :label="ux.common.cancel" text class="min-h-11" @click="dialogVisible = false" />
        <Button :label="ux.common.save" class="min-h-11" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
