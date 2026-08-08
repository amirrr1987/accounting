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
import type { CreateUnitInput, UnitOfMeasure } from "@hesabyar/shared";
import { createUnit, fetchUnits, updateUnit } from "@/lib/api";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";

const toast = useToast();
const units = ref<UnitOfMeasure[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const editing = ref<UnitOfMeasure | null>(null);

const form = reactive({
  code: "",
  nameFa: "",
  baseUnitId: null as string | null,
  conversionFactor: 1 as number | null,
});

const baseOptions = ref<Array<{ label: string; value: string | null }>>([]);

async function load(): Promise<void> {
  loading.value = true;
  try {
    units.value = await fetchUnits();
    baseOptions.value = [
      { label: "— (واحد پایه) —", value: null },
      ...units.value.map((u) => ({ label: u.nameFa, value: u.id })),
    ];
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری واحدها ناموفق بود",
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
  editing.value = null;
  form.code = "";
  form.nameFa = "";
  form.baseUnitId = null;
  form.conversionFactor = 1;
  dialogVisible.value = true;
}

function openEdit(row: UnitOfMeasure): void {
  editing.value = row;
  form.code = row.code;
  form.nameFa = row.nameFa;
  form.baseUnitId = row.baseUnitId;
  form.conversionFactor = row.conversionFactor;
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  if (!form.code.trim() || !form.nameFa.trim()) return;
  saving.value = true;
  const payload: CreateUnitInput = {
    code: form.code.trim().toUpperCase(),
    nameFa: form.nameFa.trim(),
    baseUnitId: form.baseUnitId,
    conversionFactor: form.conversionFactor ?? 1,
    isActive: true,
  };
  try {
    if (editing.value) {
      await updateUnit(editing.value.id, payload);
    } else {
      await createUnit(payload);
    }
    dialogVisible.value = false;
    await load();
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "ذخیره واحد ناموفق بود",
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="hy-page" dir="rtl">
    <Toast />
    <PageHeader title="واحدهای اندازه‌گیری" subtitle="کیسه، کارتن، بطری، …">
      <template #actions>
        <Button label="واحد جدید" icon="pi pi-plus" @click="openCreate" />
      </template>
    </PageHeader>

    <EmptyState
      v-if="!loading && units.length === 0"
      title="واحدی تعریف نشده"
      description="از seed یا دکمه بالا واحد اضافه کنید"
    />

    <DataTable v-else :value="units" :loading="loading" class="text-sm">
      <Column field="code" header="کد" />
      <Column field="nameFa" header="نام" />
      <Column header="واحد پایه">
        <template #body="{ data }">
          {{ data.baseUnitNameFa ?? "—" }}
        </template>
      </Column>
      <Column header="ضریب تبدیل">
        <template #body="{ data }">{{ data.conversionFactor }}</template>
      </Column>
      <Column header="وضعیت">
        <template #body="{ data }">
          <Tag :value="data.isActive ? 'فعال' : 'غیرفعال'" />
        </template>
      </Column>
      <Column header="">
        <template #body="{ data }">
          <Button icon="pi pi-pencil" text rounded @click="openEdit(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="dialogVisible"
      :header="editing ? 'ویرایش واحد' : 'واحد جدید'"
      modal
      class="w-full max-w-md"
    >
      <div class="flex flex-col gap-3">
        <InputText v-model="form.code" placeholder="کد (مثلاً CARTON)" />
        <InputText v-model="form.nameFa" placeholder="نام فارسی" />
        <Select
          v-model="form.baseUnitId"
          :options="baseOptions"
          option-label="label"
          option-value="value"
          placeholder="واحد پایه"
        />
        <InputNumber
          v-model="form.conversionFactor"
          :min="0.0001"
          :max-fraction-digits="4"
          placeholder="ضریب تبدیل به واحد پایه"
        />
      </div>
      <template #footer>
        <Button label="انصراف" text @click="dialogVisible = false" />
        <Button label="ذخیره" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
