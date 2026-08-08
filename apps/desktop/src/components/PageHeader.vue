<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <header
    class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4"
  >
    <div class="min-w-0">
      <h1 class="text-2xl sm:text-[1.75rem] font-bold text-[var(--hy-text)] m-0 tracking-tight">
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="text-sm text-[var(--hy-muted)] mt-1 mb-0 leading-relaxed max-w-2xl"
      >
        {{ subtitle }}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
