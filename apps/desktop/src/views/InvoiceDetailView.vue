<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import {
  INVOICE_KIND_LABELS,
  isReturnKind,
  type Invoice,
} from "@hesabyar/shared";
import { fetchInvoice } from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { printInvoice } from "@/lib/invoice-print";
import PageHeader from "@/components/PageHeader.vue";
import { ux } from "@/locale/ux-copy";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const invoice = ref<Invoice | null>(null);
const loading = ref(true);

const canReturn = (inv: Invoice): boolean =>
  !inv.deletedAt &&
  !isReturnKind(inv.kind) &&
  (inv.kind === "SALE" || inv.kind === "PURCHASE") &&
  inv.lines.some((l) => (l.remainingQty ?? l.quantity) > 0);

onMounted(async () => {
  try {
    invoice.value = await fetchInvoice(route.params.id as string);
  } catch {
    toast.add({ severity: "error", summary: ux.invoices.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
});

function print(): void {
  if (invoice.value) printInvoice(invoice.value);
}

function goReturn(): void {
  void router.push(`/invoices/${route.params.id}/return`);
}
</script>

<template>
  <div class="hy-page" dir="rtl">
    <Toast />
    <PageHeader
      v-if="invoice"
      :title="invoice.number"
      :subtitle="invoice.partyName"
    >
      <template #actions>
        <Tag :value="INVOICE_KIND_LABELS[invoice.kind]" />
        <Tag v-if="invoice.deletedAt" value="حذف‌شده" severity="danger" />
        <Button
          v-if="canReturn(invoice)"
          label="ثبت مرجوعی"
          icon="pi pi-replay"
          outlined
          class="min-h-11"
          @click="goReturn"
        />
        <Button
          :label="ux.reports.print"
          icon="pi pi-print"
          outlined
          class="min-h-11"
          @click="print"
        />
      </template>
    </PageHeader>

    <div v-if="invoice" class="hy-surface p-4">
      <p class="text-sm text-[var(--hy-muted)]">
        تاریخ: {{ invoice.dateJalali }}
        <span v-if="invoice.voucherNumber">
          · سند: {{ invoice.voucherNumber }}
        </span>
        <span v-if="invoice.originalInvoiceNumber">
          · مبدأ: {{ invoice.originalInvoiceNumber }}
        </span>
      </p>
      <p v-if="invoice.returnReason" class="text-sm text-amber-800 mt-2">
        دلیل مرجوعی: {{ invoice.returnReason }}
      </p>
      <DataTable :value="invoice.lines" class="mt-3">
        <Column field="productName" header="کالا" />
        <Column header="تعداد">
          <template #body="{ data }">
            {{ data.quantity }}
            <span v-if="data.unitNameFa" class="text-xs text-slate-500">
              {{ data.unitNameFa }}
            </span>
          </template>
        </Column>
        <Column header="قیمت واحد">
          <template #body="{ data }">
            {{ formatMoneyFa(data.unitPrice) }}
          </template>
        </Column>
        <Column header="تخفیف">
          <template #body="{ data }">
            {{ data.discountAmount !== "0" ? formatMoneyFa(data.discountAmount) : "—" }}
          </template>
        </Column>
        <Column header="جمع">
          <template #body="{ data }">
            {{ formatMoneyFa(data.lineTotal) }}
          </template>
        </Column>
      </DataTable>
      <div class="mt-4 space-y-1 text-sm">
        <p>جمع خالص: {{ formatMoneyFa(invoice.subtotal) }}</p>
        <p>مالیات: {{ formatMoneyFa(invoice.vatAmount) }}</p>
        <p v-if="invoice.headerDiscount !== '0'">
          تخفیف سر فاکتور: {{ formatMoneyFa(invoice.headerDiscount) }}
        </p>
        <p v-if="invoice.commissionAmount !== '0'">
          پورسانت: {{ formatMoneyFa(invoice.commissionAmount) }}
          <span v-if="invoice.commissionRate">
            ({{ Math.round((invoice.commissionRate ?? 0) * 1000) / 10 }}٪)
          </span>
        </p>
        <p class="font-bold text-base">
          جمع کل: {{ formatMoneyFa(invoice.total) }}
        </p>
      </div>
    </div>
  </div>
</template>
