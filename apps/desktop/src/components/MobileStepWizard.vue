<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";

const props = defineProps<{
  steps: readonly string[];
  step: number;
  nextLabel?: string;
  backLabel?: string;
  finishLabel?: string;
  canNext?: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  next: [];
  finish: [];
}>();

const isFirst = computed(() => props.step <= 0);
const isLast = computed(() => props.step >= props.steps.length - 1);

const progress = computed(() =>
  props.steps.length <= 1
    ? 100
    : Math.round((props.step / (props.steps.length - 1)) * 100),
);
</script>

<template>
  <div class="space-y-4">
    <div
      class="hy-surface p-3"
      role="progressbar"
      :aria-valuenow="progress"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="text-xs font-medium text-[var(--hy-muted)]">
          مرحله {{ step + 1 }} از {{ steps.length }}
        </span>
        <span class="text-xs text-[var(--hy-primary)] font-semibold">
          {{ steps[step] }}
        </span>
      </div>
      <div class="h-1.5 rounded-full bg-[var(--hy-border)] overflow-hidden">
        <div
          class="h-full rounded-full bg-[var(--hy-accent)] transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <slot />

    <div class="flex gap-2 pt-2">
      <Button
        v-if="!isFirst"
        :label="backLabel ?? 'قبلی'"
        icon="pi pi-arrow-right"
        outlined
        class="min-h-12 flex-1"
        :disabled="loading"
        @click="emit('back')"
      />
      <Button
        v-if="!isLast"
        :label="nextLabel ?? 'بعدی'"
        icon="pi pi-arrow-left"
        icon-pos="right"
        class="min-h-12 flex-1"
        :disabled="canNext === false"
        @click="emit('next')"
      />
      <Button
        v-else
        :label="finishLabel ?? 'ثبت'"
        icon="pi pi-check"
        class="min-h-12 flex-1"
        :disabled="canNext === false"
        :loading="loading"
        @click="emit('finish')"
      />
    </div>
  </div>
</template>
