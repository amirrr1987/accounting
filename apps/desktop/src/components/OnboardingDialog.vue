<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import { ux } from "@/locale/ux-copy";

const visible = defineModel<boolean>("visible", { default: false });

const emit = defineEmits<{ complete: [] }>();

const step = ref(0);

const steps = computed(() => [
  ux.onboarding.steps.welcome,
  ux.onboarding.steps.daily,
  ux.onboarding.steps.reports,
]);

const bodies = computed(() => [
  ux.onboarding.bodies.welcome,
  ux.onboarding.bodies.daily,
  ux.onboarding.bodies.reports,
]);

const icons = ["pi pi-compass", "pi pi-shopping-cart", "pi pi-chart-line"];

const isLast = computed(() => step.value >= steps.value.length - 1);

watch(visible, (open) => {
  if (open) step.value = 0;
});

function next(): void {
  if (isLast.value) {
    emit("complete");
    visible.value = false;
    return;
  }
  step.value += 1;
}

function back(): void {
  if (step.value > 0) step.value -= 1;
}

function skip(): void {
  emit("complete");
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :closable="false"
    :header="ux.onboarding.title"
    class="w-full max-w-md"
  >
    <div class="text-center pt-2 pb-4">
      <span
        class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--hy-primary-soft)] text-[var(--hy-primary)] mb-4"
      >
        <i :class="[icons[step], 'text-3xl']" aria-hidden="true" />
      </span>
      <p class="text-xs text-[var(--hy-muted)] m-0 mb-1">
        {{ step + 1 }} / {{ steps.length }}
      </p>
      <h2 class="text-lg font-bold m-0 text-[var(--hy-text)]">
        {{ steps[step] }}
      </h2>
      <p class="text-sm text-[var(--hy-muted)] m-0 mt-3 leading-relaxed px-2">
        {{ bodies[step] }}
      </p>
    </div>

    <div class="flex gap-1 justify-center mb-4">
      <span
        v-for="(_, i) in steps"
        :key="i"
        class="h-1.5 rounded-full transition-all"
        :class="
          i === step
            ? 'w-6 bg-[var(--hy-accent)]'
            : 'w-1.5 bg-[var(--hy-border)]'
        "
      />
    </div>

    <template #footer>
      <div class="flex w-full gap-2">
        <Button
          :label="ux.onboarding.skip"
          text
          class="min-h-11"
          @click="skip"
        />
        <Button
          v-if="step > 0"
          :label="ux.onboarding.back"
          outlined
          class="min-h-11 flex-1"
          @click="back"
        />
        <Button
          :label="isLast ? ux.onboarding.start : ux.onboarding.next"
          icon="pi pi-arrow-left"
          icon-pos="right"
          class="min-h-11 flex-1"
          @click="next"
        />
      </div>
    </template>
  </Dialog>
</template>
