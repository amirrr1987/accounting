<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import ConfirmDialog from "primevue/confirmdialog";
import { useConfirm } from "primevue/useconfirm";
import type { CreatePartyInput, Party, PartyKind } from "@hesabyar/shared";
import {
  createParty,
  deleteParty,
  fetchParties,
  updateParty,
} from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { usePageCopy } from "@/composables/usePageCopy";
import { ux } from "@/locale/ux-copy";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import MobileListCard from "@/components/MobileListCard.vue";

const toast = useToast();
const confirm = useConfirm();
const { copy: pageCopy, isMobile } = usePageCopy("parties");
const parties = ref<Party[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const editing = ref<Party | null>(null);

const form = reactive({
  kind: "CUSTOMER" as PartyKind,
  name: "",
  phone: "",
  nationalId: "",
});

const kindOptions = [
  { label: "مشتری", value: "CUSTOMER" },
  { label: "تأمین‌کننده", value: "SUPPLIER" },
];

async function load(): Promise<void> {
  loading.value = true;
  try {
    parties.value = await fetchParties();
  } catch {
    toast.add({
      severity: "error",
      summary: ux.parties.title,
      detail: ux.parties.loadError,
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
  form.kind = "CUSTOMER";
  form.name = "";
  form.phone = "";
  form.nationalId = "";
  dialogVisible.value = true;
}

function openEdit(row: Party): void {
  editing.value = row;
  form.kind = row.kind;
  form.name = row.name;
  form.phone = row.phone ?? "";
  form.nationalId = row.nationalId ?? "";
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  if (!form.name.trim()) return;
  saving.value = true;
  try {
    const payload: CreatePartyInput = {
      kind: form.kind,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      nationalId: form.nationalId.trim() || null,
    };
    if (editing.value) {
      await updateParty(editing.value.id, payload);
    } else {
      await createParty(payload);
    }
    dialogVisible.value = false;
    toast.add({
      severity: "success",
      summary: editing.value ? "ویرایش شد" : "افزوده شد",
      detail: form.name.trim(),
      life: 2500,
    });
    await load();
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: apiErrorMessage(err, "ذخیره ناموفق بود"),
      life: 6000,
    });
  } finally {
    saving.value = false;
  }
}

async function deactivate(row: Party): Promise<void> {
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
          await deleteParty(row.id);
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
          :label="ux.parties.create"
          icon="pi pi-plus"
          class="min-h-11"
          @click="openCreate"
        />
      </template>
    </PageHeader>

    <EmptyState
      v-if="!loading && parties.length === 0"
      :title="ux.parties.emptyTitle"
      :description="ux.parties.emptyBody"
      icon="pi pi-users"
      :action-label="ux.parties.emptyCta"
      @action="openCreate"
    />

    <ul
      v-else-if="isMobile"
      class="list-none m-0 p-0 space-y-2"
    >
      <li v-for="row in parties" :key="row.id">
        <MobileListCard
          :title="row.name"
          :subtitle="row.phone ?? 'بدون تلفن'"
          :meta="row.kind === 'CUSTOMER' ? 'مشتری' : 'تأمین‌کننده'"
          :meta-severity="row.isActive ? 'info' : 'secondary'"
          @click="openEdit(row)"
        />
      </li>
    </ul>

    <div v-else class="hy-surface overflow-hidden">
      <DataTable
        :value="parties"
        :loading="loading"
        paginator
        :rows="15"
        class="text-sm"
      >
        <Column field="name" header="نام" />
        <Column header="نوع">
          <template #body="{ data }">
            {{ data.kind === "CUSTOMER" ? "مشتری" : "تأمین‌کننده" }}
          </template>
        </Column>
        <Column field="phone" header="تلفن" />
        <Column field="nationalId" header="شناسه ملی" />
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
      :header="editing ? 'ویرایش طرف‌حساب' : ux.parties.create"
      class="w-full max-w-md"
    >
      <div class="flex flex-col gap-3 pt-2">
        <label class="text-sm text-[var(--hy-muted)]">نوع</label>
        <Select
          v-model="form.kind"
          :options="kindOptions"
          option-label="label"
          option-value="value"
        />
        <label class="text-sm text-[var(--hy-muted)]">نام</label>
        <InputText v-model="form.name" class="min-h-11" />
        <label class="text-sm text-[var(--hy-muted)]">تلفن</label>
        <InputText v-latin-digits v-model="form.phone" class="min-h-11" />
        <label class="text-sm text-[var(--hy-muted)]">شناسه ملی</label>
        <InputText v-latin-digits v-model="form.nationalId" class="min-h-11" />
      </div>
      <template #footer>
        <Button
          :label="ux.common.cancel"
          text
          class="min-h-11"
          @click="dialogVisible = false"
        />
        <Button
          :label="ux.common.save"
          class="min-h-11"
          :loading="saving"
          @click="save"
        />
      </template>
    </Dialog>
  </div>
</template>
