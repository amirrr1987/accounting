<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type {
  CreateWeightAdjustmentInput,
  Invoice,
  Product,
  WeightAdjustment,
  WeightAdjustmentKind,
} from "@hesabyar/shared";
import {
  WEIGHT_ADJUSTMENT_KIND_LABELS,
  todayJalali,
} from "@hesabyar/shared";
import {
  createWeightAdjustment,
  fetchInvoices,
  fetchProducts,
  fetchWeightAdjustments,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import MobileListCard from "@/components/MobileListCard.vue";
import JalaliDatePicker from "@/components/JalaliDatePicker.vue";
import { formatMoneyFa } from "@/lib/money";
import { usePageCopy } from "@/composables/usePageCopy";

const toast = useToast();
const { copy: pageCopy, isMobile } = usePageCopy("weightAdjustments");
const rows = ref<WeightAdjustment[]>([]);
const products = ref<Product[]>([]);
const purchaseInvoices = ref<Invoice[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);

const form = reactive({
  productId: null as string | null,
  kind: "SHORTAGE" as WeightAdjustmentKind,
  quantity: 1 as number | null,
  reason: "",
  dateJalali: todayJalali(),
  sourceInvoiceId: null as string | null,
});

const kindOptions = Object.entries(WEIGHT_ADJUSTMENT_KIND_LABELS).map(
  ([value, label]) => ({ value, label }),
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [adj, prods, invs] = await Promise.all([
      fetchWeightAdjustments(),
      fetchProducts(),
      fetchInvoices(),
    ]);
    rows.value = adj;
    products.value = prods.filter((p) => p.isActive);
    purchaseInvoices.value = invs.filter(
      (i) => i.kind === "PURCHASE" && !i.deletedAt,
    );
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری کسر/اضافه بار ناموفق بود",
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function openCreate(): void {
  form.productId = null;
  form.kind = "SHORTAGE";
  form.quantity = 1;
  form.reason = "";
  form.dateJalali = todayJalali();
  form.sourceInvoiceId = null;
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  if (!form.productId || !form.quantity || !form.reason.trim()) return;
  saving.value = true;
  try {
    const payload: CreateWeightAdjustmentInput = {
      productId: form.productId,
      kind: form.kind,
      quantity: Math.trunc(form.quantity),
      reason: form.reason.trim(),
      dateJalali: form.dateJalali,
      sourceInvoiceId: form.sourceInvoiceId,
    };
    await createWeightAdjustment(payload);
    toast.add({
      severity: "success",
      summary: "ثبت شد",
      detail: WEIGHT_ADJUSTMENT_KIND_LABELS[form.kind],
      life: 3500,
    });
    dialogVisible.value = false;
    await load();
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "ثبت کسر/اضافه بار ناموفق بود",
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div :class="isMobile ? 'hy-page-mobile space-y-4' : 'hy-page'" dir="rtl">
    <Toast />
    <PageHeader
      :title="pageCopy.title"
      :subtitle="pageCopy.subtitle"
      :hint="pageCopy.hint"
    >
      <template #actions>
        <Button
          label="ثبت جدید"
          icon="pi pi-plus"
          class="min-h-11"
          @click="openCreate"
        />
      </template>
    </PageHeader>

    <div class="hy-surface overflow-hidden">
      <EmptyState
        v-if="!loading && rows.length === 0"
        icon="pi pi-box"
        title="هنوز تعدیلی ثبت نشده"
        description="پس از خرید، کسر یا اضافه بار را اینجا ثبت کنید"
        action-label="ثبت جدید"
        @action="openCreate"
      />

      <ul
        v-else-if="isMobile"
        class="list-none m-0 p-0 divide-y divide-[var(--hy-border)]"
      >
        <li v-for="row in rows" :key="row.id">
          <MobileListCard
            :title="row.productName"
            :subtitle="`${row.dateJalali} · ${WEIGHT_ADJUSTMENT_KIND_LABELS[row.kind as WeightAdjustmentKind]}`"
            :meta="formatMoneyFa(row.costAmount)"
          />
        </li>
      </ul>

      <DataTable
        v-else
        :value="rows"
        :loading="loading"
        striped-rows
        paginator
        :rows="15"
        empty-message=" "
      >
        <template #empty>
          <EmptyState
            icon="pi pi-box"
            title="هنوز تعدیلی ثبت نشده"
            description="پس از خرید، کسر یا اضافه بار را اینجا ثبت کنید"
          />
        </template>
        <Column field="dateJalali" header="تاریخ" />
        <Column field="productName" header="کالا" />
        <Column header="نوع">
          <template #body="{ data }">
            {{ WEIGHT_ADJUSTMENT_KIND_LABELS[data.kind as WeightAdjustmentKind] }}
          </template>
        </Column>
        <Column field="quantity" header="مقدار" />
        <Column header="بهای تمام‌شده">
          <template #body="{ data }">
            {{ formatMoneyFa(data.costAmount) }}
          </template>
        </Column>
        <Column field="reason" header="علت" />
        <Column field="voucherNumber" header="سند" />
      </DataTable>
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      modal
      header="ثبت کسر/اضافه بار"
      class="w-full max-w-lg"
    >
      <div class="flex flex-col gap-3 pt-2">
        <label class="text-sm text-[var(--hy-muted)]">کالا</label>
        <Select
          v-model="form.productId"
          :options="products"
          option-label="name"
          option-value="id"
          filter
          placeholder="انتخاب کالا"
          class="w-full"
        />
        <label class="text-sm text-[var(--hy-muted)]">نوع</label>
        <Select
          v-model="form.kind"
          :options="kindOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
        <label class="text-sm text-[var(--hy-muted)]">مقدار (واحد پایه)</label>
        <InputNumber v-latin-digits v-model="form.quantity" :min="1" class="w-full" />
        <label class="text-sm text-[var(--hy-muted)]">تاریخ</label>
        <JalaliDatePicker v-model="form.dateJalali" />
        <label class="text-sm text-[var(--hy-muted)]">فاکتور خرید مبدأ (اختیاری)</label>
        <Select
          v-model="form.sourceInvoiceId"
          :options="purchaseInvoices"
          option-label="number"
          option-value="id"
          show-clear
          filter
          placeholder="—"
          class="w-full"
        />
        <label class="text-sm text-[var(--hy-muted)]">علت</label>
        <InputText v-model="form.reason" class="w-full" placeholder="مثلاً شکستگی در انبار" />
      </div>
      <template #footer>
        <Button label="انصراف" text class="min-h-11" @click="dialogVisible = false" />
        <Button label="ثبت" class="min-h-11" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
