<script setup lang="ts">
import { computed, watch } from "vue";
import Select from "primevue/select";
import {
  currentJalaliYear,
  isValidJalaliDateString,
  todayJalali,
} from "@hesabyar/shared";

const model = defineModel<string>({ default: "" });

const props = withDefaults(
  defineProps<{
    label?: string;
    invalid?: boolean;
    /** اگر true باشد مقدار خالی به امروز تبدیل نمی‌شود (برای فیلترهای اختیاری) */
    allowEmpty?: boolean;
  }>(),
  { label: "تاریخ", invalid: false, allowEmpty: false },
);

const currentYear = Number(currentJalaliYear());
const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

const parts = computed(() => {
  const source = model.value || (props.allowEmpty ? "" : todayJalali());
  if (!source) return { y: currentYear, m: 1, d: 1 };
  const [y, m, d] = source.split("/").map(Number);
  return { y: y ?? currentYear, m: m ?? 1, d: d ?? 1 };
});

const dayOptions = computed(() => {
  const { y, m } = parts.value;
  let max = m <= 6 ? 31 : m <= 11 ? 30 : 29;
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
    if (!v && !props.allowEmpty) model.value = todayJalali();
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
