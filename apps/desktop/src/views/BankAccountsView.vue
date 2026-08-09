<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import ConfirmDialog from "primevue/confirmdialog";
import { useConfirm } from "primevue/useconfirm";
import type { BankAccount, CreateBankAccountInput } from "@hesabyar/shared";
import {
  createBankAccount,
  deactivateBankAccount,
  fetchBankAccounts,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import MobileListCard from "@/components/MobileListCard.vue";
import { formatMoneyFa } from "@/lib/money";
import { usePageCopy } from "@/composables/usePageCopy";

const toast = useToast();
const confirm = useConfirm();
const { copy: pageCopy, isMobile } = usePageCopy("bankAccounts");
const rows = ref<BankAccount[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);

const form = reactive({
  name: "",
  bankName: "",
  accountNumber: "",
  sheba: "",
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    rows.value = await fetchBankAccounts();
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری حساب‌های بانکی ناموفق بود",
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
  form.name = "";
  form.bankName = "";
  form.accountNumber = "";
  form.sheba = "";
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  if (!form.name.trim() || !form.bankName.trim()) return;
  saving.value = true;
  try {
    const payload: CreateBankAccountInput = {
      name: form.name.trim(),
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim() || null,
      sheba: form.sheba.trim() || null,
    };
    await createBankAccount(payload);
    toast.add({
      severity: "success",
      summary: "ثبت شد",
      detail: "حساب بانکی و سرفصل تفصیلی ایجاد شد",
      life: 3500,
    });
    dialogVisible.value = false;
    await load();
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "ثبت حساب بانکی ناموفق بود",
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}

async function deactivate(row: BankAccount): Promise<void> {
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
          await deactivateBankAccount(row.id);
          await load();
          toast.add({
            severity: "success",
            summary: "غیرفعال شد",
            detail: row.name,
            life: 2500,
          });
        } catch {
          toast.add({
            severity: "error",
            summary: "خطا",
            detail: "غیرفعال‌سازی ناموفق بود",
            life: 4000,
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
          label="حساب جدید"
          icon="pi pi-plus"
          class="min-h-11"
          @click="openCreate"
        />
      </template>
    </PageHeader>

    <div class="hy-surface overflow-hidden">
      <EmptyState
        v-if="!loading && rows.length === 0"
        icon="pi pi-building-columns"
        title="حساب بانکی ثبت نشده"
        description="برای دریافت و پرداخت از طریق بانک، ابتدا حساب را تعریف کنید"
        action-label="حساب جدید"
        @action="openCreate"
      />

      <ul
        v-else-if="isMobile"
        class="list-none m-0 p-0 divide-y divide-[var(--hy-border)]"
      >
        <li v-for="row in rows" :key="row.id">
          <MobileListCard
            :title="row.name"
            :subtitle="`${row.bankName} · ${row.coaAccountCode}`"
            :meta="formatMoneyFa(row.currentBalance)"
            :meta-severity="row.isActive ? 'success' : 'secondary'"
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
            icon="pi pi-building-columns"
            title="حساب بانکی ثبت نشده"
            description="برای دریافت و پرداخت از طریق بانک، ابتدا حساب را تعریف کنید"
          />
        </template>
        <Column field="bankName" header="بانک" />
        <Column field="name" header="عنوان حساب" />
        <Column field="coaAccountCode" header="کد سرفصل" />
        <Column header="مانده">
          <template #body="{ data }">
            {{ formatMoneyFa(data.currentBalance) }}
          </template>
        </Column>
        <Column header="وضعیت">
          <template #body="{ data }">
            <Tag
              :value="data.isActive ? 'فعال' : 'غیرفعال'"
              :severity="data.isActive ? 'success' : 'secondary'"
            />
          </template>
        </Column>
        <Column header="">
          <template #body="{ data }">
            <Button
              v-if="data.isActive"
              icon="pi pi-ban"
              text
              rounded
              severity="danger"
              aria-label="غیرفعال"
              @click="deactivate(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      modal
      header="حساب بانکی جدید"
      class="w-full max-w-md"
    >
      <div class="flex flex-col gap-3 pt-2">
        <label class="text-sm text-[var(--hy-muted)]">نام بانک</label>
        <InputText v-model="form.bankName" class="min-h-11" />
        <label class="text-sm text-[var(--hy-muted)]">عنوان حساب</label>
        <InputText v-model="form.name" class="min-h-11" placeholder="مثلاً جاری فروش" />
        <label class="text-sm text-[var(--hy-muted)]">شماره حساب (اختیاری)</label>
        <InputText v-latin-digits v-model="form.accountNumber" class="min-h-11" />
        <label class="text-sm text-[var(--hy-muted)]">شبا (اختیاری)</label>
        <InputText v-latin-digits v-model="form.sheba" class="min-h-11" dir="ltr" />
      </div>
      <template #footer>
        <Button label="انصراف" text class="min-h-11" @click="dialogVisible = false" />
        <Button label="ثبت" class="min-h-11" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
