<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { INVOICE_KIND_LABELS, type Invoice } from "@hesabyar/shared";
import { fetchInvoices, softDeleteInvoice } from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { ux } from "@/locale/ux-copy";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";

const toast = useToast();
const confirm = useConfirm();
const router = useRouter();
const invoices = ref<Invoice[]>([]);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    invoices.value = await fetchInvoices();
  } catch {
    toast.add({
      severity: "error",
      summary: ux.invoices.title,
      detail: ux.invoices.loadError,
      life: 4500,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function confirmDelete(row: Invoice): void {
  confirm.require({
    message: ux.invoices.deleteConfirmBody(row.number),
    header: ux.invoices.deleteConfirmTitle,
    icon: "pi pi-exclamation-triangle",
    acceptLabel: ux.invoices.deleteAccept,
    rejectLabel: ux.invoices.deleteReject,
    accept: () => {
      void (async () => {
        try {
          await softDeleteInvoice(row.id);
          toast.add({
            severity: "success",
            summary: "فاکتور حذف شد",
            detail: "سند معکوس برای خنثی‌سازی اثر فاکتور ثبت شد.",
            life: 3200,
          });
          await load();
        } catch {
          toast.add({
            severity: "error",
            summary: "حذف انجام نشد",
            detail: "فاکتور حذف نشد. اتصال را بررسی کنید و دوباره تلاش کنید.",
            life: 4500,
          });
        }
      })();
    },
  });
}
</script>

<template>
  <div class="hy-page" dir="rtl">
    <Toast />
    <ConfirmDialog />

    <PageHeader :title="ux.invoices.title" :subtitle="ux.invoices.subtitle">
      <template #actions>
        <Button
          :label="ux.invoices.create"
          icon="pi pi-plus"
          class="min-h-11"
          @click="router.push('/invoices/new')"
        />
      </template>
    </PageHeader>

    <div class="hy-surface overflow-hidden">
      <EmptyState
        v-if="!loading && invoices.length === 0"
        :title="ux.invoices.emptyTitle"
        :description="ux.invoices.emptyBody"
        icon="pi pi-file"
        :action-label="ux.invoices.emptyCta"
        @action="router.push('/invoices/new')"
      />

      <DataTable
        v-else
        :value="invoices"
        :loading="loading"
        paginator
        :rows="15"
        class="text-sm"
      >
        <Column field="number" header="شماره" />
        <Column header="نوع">
          <template #body="{ data }">
            {{ INVOICE_KIND_LABELS[data.kind] }}
          </template>
        </Column>
        <Column field="partyName" header="طرف‌حساب" />
        <Column field="dateJalali" header="تاریخ" />
        <Column header="جمع">
          <template #body="{ data }">
            {{ formatMoneyFa(data.total) }}
          </template>
        </Column>
        <Column field="voucherNumber" header="سند" />
        <Column header="وضعیت">
          <template #body="{ data }">
            <Tag
              :value="data.deletedAt ? 'حذف‌شده' : ux.common.active"
              :severity="data.deletedAt ? 'danger' : 'success'"
            />
          </template>
        </Column>
        <Column header="عملیات">
          <template #body="{ data }">
            <Button
              icon="pi pi-eye"
              text
              rounded
              class="hy-touch"
              @click="router.push(`/invoices/${data.id}`)"
            />
            <Button
              v-if="!data.deletedAt"
              icon="pi pi-trash"
              text
              rounded
              class="hy-touch"
              severity="danger"
              :aria-label="ux.common.delete"
              @click="confirmDelete(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
