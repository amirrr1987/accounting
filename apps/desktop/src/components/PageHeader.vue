<script setup lang="ts">
import ContextHelp from "@/components/ContextHelp.vue";

defineProps<{
  title: string;
  subtitle?: string;
  hint?: string;
}>();
</script>

<template>
  <header
    class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4"
  >
    <div class="min-w-0 space-y-2">
      <div>
        <h1
          class="text-2xl sm:text-[1.75rem] font-bold text-[var(--hy-text)] m-0 tracking-tight"
        >
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="text-sm text-[var(--hy-muted)] mt-1 mb-0 leading-relaxed max-w-2xl"
        >
          {{ subtitle }}
        </p>
      </div>
      <ContextHelp v-if="hint" :text="hint" />
    </div>
    <div class="flex flex-wrap items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
