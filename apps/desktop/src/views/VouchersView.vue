<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import type { Voucher } from "@hesabyar/shared";
import { fetchVouchers } from "@/lib/api";
import { formatMoneyFa } from "@/lib/money";
import { usePageCopy } from "@/composables/usePageCopy";
import { ux } from "@/locale/ux-copy";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import MobileListCard from "@/components/MobileListCard.vue";

const toast = useToast();
const router = useRouter();
const { copy: pageCopy, isMobile } = usePageCopy("vouchers");
const vouchers = ref<Voucher[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    vouchers.value = await fetchVouchers();
  } catch {
    toast.add({
      severity: "error",
      summary: ux.vouchers.title,
      detail: ux.vouchers.loadError,
      life: 4500,
    });
  } finally {
    loading.value = false;
  }
});
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
          :label="ux.vouchers.create"
          icon="pi pi-plus"
          class="min-h-11"
          @click="router.push('/vouchers/new')"
        />
      </template>
    </PageHeader>

    <div class="hy-surface overflow-hidden">
      <EmptyState
        v-if="!loading && vouchers.length === 0"
        :title="ux.vouchers.emptyTitle"
        :description="ux.vouchers.emptyBody"
        icon="pi pi-book"
        :action-label="ux.vouchers.emptyCta"
        @action="router.push('/vouchers/new')"
      />

      <ul
        v-else-if="isMobile"
        class="list-none m-0 p-0 space-y-2"
      >
        <li v-for="row in vouchers" :key="row.id">
          <MobileListCard
            :title="row.description || `سند ${row.number}`"
            :subtitle="`${row.number} · ${row.dateJalali}`"
            :meta="formatMoneyFa(row.totalDebit)"
            meta-severity="info"
            @click="router.push(`/vouchers/${row.id}`)"
          />
        </li>
      </ul>

      <DataTable
        v-else
        :value="vouchers"
        :loading="loading"
        paginator
        :rows="15"
        class="text-sm"
      >
        <Column field="number" header="شماره سند" />
        <Column field="dateJalali" header="تاریخ" />
        <Column field="description" header="شرح" />
        <Column header="بدهکار">
          <template #body="{ data }">
            {{ formatMoneyFa(data.totalDebit) }}
          </template>
        </Column>
        <Column header="بستانکار">
          <template #body="{ data }">
            {{ formatMoneyFa(data.totalCredit) }}
          </template>
        </Column>
        <Column header="عملیات">
          <template #body="{ data }">
            <Button
              icon="pi pi-eye"
              text
              rounded
              class="hy-touch"
              @click="router.push(`/vouchers/${data.id}`)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
