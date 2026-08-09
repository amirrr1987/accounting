<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import Drawer from "primevue/drawer";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Checkbox from "primevue/checkbox";
import Button from "primevue/button";
import {
  CreateAccountSchema,
  defaultNatureForType,
  type Account,
  type AccountLevel,
  type AccountNature,
  type AccountType,
  type CreateAccountInput,
} from "@hesabyar/shared";
import {
  ACCOUNT_LEVEL_LABELS,
  ACCOUNT_NATURE_LABELS,
  ACCOUNT_TYPE_LABELS,
} from "@/lib/account-labels";

const props = defineProps<{
  visible: boolean;
  account: Account | null;
  parentOptions: Account[];
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  save: [payload: CreateAccountInput];
}>();

const isEdit = computed(() => props.account !== null);

const form = reactive({
  code: "",
  name: "",
  type: "ASSET" as AccountType,
  nature: "DEBIT" as AccountNature,
  level: "DETAIL" as AccountLevel,
  parentId: null as string | null,
  isActive: true,
});

const typeOptions = Object.entries(ACCOUNT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const natureOptions = Object.entries(ACCOUNT_NATURE_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const levelOptions = Object.entries(ACCOUNT_LEVEL_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const parentSelectOptions = computed(() =>
  props.parentOptions
    .filter((a) => a.id !== props.account?.id)
    .map((a) => ({
      label: `${a.code} — ${a.name}`,
      value: a.id,
    })),
);

watch(
  () => [props.visible, props.account] as const,
  ([visible, account]) => {
    if (!visible) return;
    if (account) {
      form.code = account.code;
      form.name = account.name;
      form.type = account.type;
      form.nature = account.nature;
      form.level = account.level;
      form.parentId = account.parentId;
      form.isActive = account.isActive;
    } else {
      form.code = "";
      form.name = "";
      form.type = "ASSET";
      form.nature = "DEBIT";
      form.level = "DETAIL";
      form.parentId = null;
      form.isActive = true;
    }
  },
);

watch(
  () => form.type,
  (type) => {
    form.nature = defaultNatureForType(type);
  },
);

function close(): void {
  emit("update:visible", false);
}

function submit(): void {
  const parsed = CreateAccountSchema.parse({
    code: form.code.trim(),
    name: form.name.trim(),
    type: form.type,
    nature: form.nature,
    level: form.level,
    parentId: form.parentId,
    isActive: form.isActive,
  });
  emit("save", parsed);
}
</script>

<template>
  <Drawer
    :visible="visible"
    position="left"
    class="!w-full md:!w-[28rem]"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <span class="font-bold text-lg">
        {{ isEdit ? "ویرایش حساب" : "حساب جدید" }}
      </span>
    </template>

    <div class="flex flex-col gap-4 pt-2" dir="rtl">
      <div class="flex flex-col gap-2">
        <label class="text-sm text-slate-600">کد حساب</label>
        <InputText v-latin-digits v-model="form.code" class="w-full" />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-slate-600">نام حساب</label>
        <InputText v-model="form.name" class="w-full" />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-slate-600">نوع</label>
        <Select
          v-model="form.type"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-slate-600">ماهیت</label>
        <Select
          v-model="form.nature"
          :options="natureOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-slate-600">سطح</label>
        <Select
          v-model="form.level"
          :options="levelOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-slate-600">حساب والد</label>
        <Select
          v-model="form.parentId"
          :options="parentSelectOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="بدون والد (گروه)"
          class="w-full"
          filter
        />
      </div>

      <div class="flex items-center gap-2">
        <Checkbox v-model="form.isActive" binary input-id="active" />
        <label for="active">فعال</label>
      </div>

      <div class="flex gap-2 mt-4">
        <Button label="ذخیره" icon="pi pi-check" class="flex-1" @click="submit" />
        <Button
          label="انصراف"
          severity="secondary"
          outlined
          class="flex-1"
          @click="close"
        />
      </div>
    </div>
  </Drawer>
</template>
