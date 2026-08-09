<script setup lang="ts">
import { computed, watch } from "vue";
import Select from "primevue/select";
import { isValidJalaliDateString, todayJalali } from "@hesabyar/shared";

const model = defineModel<string>({ default: "" });

const props = withDefaults(
  defineProps<{
    label?: string;
    invalid?: boolean;
  }>(),
  { label: "تاریخ", invalid: false },
);

const years = Array.from({ length: 11 }, (_, i) => 1400 + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

const parts = computed(() => {
  const [y, m, d] = (model.value || todayJalali()).split("/").map(Number);
  return { y: y ?? 1403, m: m ?? 1, d: d ?? 1 };
});

const dayOptions = computed(() => {
  const { y, m } = parts.value;
  let max = m <= 6 ? 31 : m <= 11 ? 30 : 29;
  // سال کبیسه: اسفند ۳۰ روز دارد
  if (m === 12 && isValidJalaliDateString(`${y}/12/30`)) {
    max = 30;
  }
  return Array.from({ length: max }, (_, i) => i + 1);
});

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function emit(y: number, m: number, d: number): void {
  const candidate = `${y}/${pad(m)}/${pad(d)}`;
  if (isValidJalaliDateString(candidate)) {
    model.value = candidate;
  }
}

watch(
  () => model.value,
  (v) => {
    if (!v) model.value = todayJalali();
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="props.label" class="text-sm text-[var(--hy-muted)]">{{ props.label }}</label>
    <div class="grid grid-cols-3 gap-2">
      <Select
        :model-value="parts.y"
        :options="years"
        placeholder="سال"
        class="w-full"
        :invalid="props.invalid"
        @update:model-value="(v: number) => emit(v, parts.m, parts.d)"
      />
      <Select
        :model-value="parts.m"
        :options="months"
        placeholder="ماه"
        class="w-full"
        :invalid="props.invalid"
        @update:model-value="(v: number) => emit(parts.y, v, parts.d)"
      />
      <Select
        :model-value="parts.d"
        :options="dayOptions"
        placeholder="روز"
        class="w-full"
        :invalid="props.invalid"
        @update:model-value="(v: number) => emit(parts.y, parts.m, v)"
      />
    </div>
  </div>
</template>
