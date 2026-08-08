<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type { Voucher } from "@hesabyar/shared";
import { fetchAccounts, fetchVoucher } from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { printVoucher } from "@/lib/voucher-print";
import PageHeader from "@/components/PageHeader.vue";
import { ux } from "@/locale/ux-copy";

const route = useRoute();
const toast = useToast();
const voucher = ref<Voucher | null>(null);
const accountNames = ref<Map<string, string>>(new Map());
const loading = ref(true);

const kindLabels: Record<string, string> = {
  GENERAL: "عمومی",
  RECEIPT: "دریافت",
  PAYMENT: "پرداخت",
  INVOICE: "فاکتور",
  REVERSAL: "برگشت",
};

onMounted(async () => {
  const id = route.params.id as string;
  try {
    const [v, accounts] = await Promise.all([
      fetchVoucher(id),
      fetchAccounts(),
    ]);
    voucher.value = v;
    accountNames.value = new Map(accounts.map((a) => [a.id, `${a.code} — ${a.name}`]));
  } catch {
    toast.add({ severity: "error", summary: ux.vouchers.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
});

function print(): void {
  if (voucher.value) printVoucher(voucher.value, accountNames.value);
}
</script>

<template>
  <div class="hy-page" dir="rtl">
    <Toast />
    <PageHeader
      v-if="voucher"
      :title="voucher.number"
      :subtitle="voucher.description"
    >
      <template #actions>
        <Tag :value="kindLabels[voucher.kind] ?? voucher.kind" />
        <Button
          :label="ux.reports.print"
          icon="pi pi-print"
          outlined
          class="min-h-11"
          @click="print"
        />
      </template>
    </PageHeader>

    <div v-if="voucher" class="hy-surface p-4">
      <p class="text-sm text-[var(--hy-muted)]">
        تاریخ: {{ voucher.dateJalali }}
      </p>
      <DataTable :value="voucher.lines" class="mt-3">
        <Column header="حساب">
          <template #body="{ data }">
            {{ accountNames.get(data.accountId) ?? data.accountId }}
          </template>
        </Column>
        <Column field="description" header="شرح" />
        <Column header="بدهکار">
          <template #body="{ data }">
            {{ formatMoneyFa(data.debit) }}
          </template>
        </Column>
        <Column header="بستانکار">
          <template #body="{ data }">
            {{ formatMoneyFa(data.credit) }}
          </template>
        </Column>
      </DataTable>
      <div class="flex gap-6 mt-4 font-semibold">
        <span>جمع بدهکار: {{ formatMoneyFa(voucher.totalDebit) }}</span>
        <span>جمع بستانکار: {{ formatMoneyFa(voucher.totalCredit) }}</span>
      </div>
    </div>
  </div>
</template>
