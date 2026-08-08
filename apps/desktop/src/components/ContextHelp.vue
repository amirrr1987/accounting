<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>

<template>
  <p
    class="text-xs text-[var(--hy-muted)] m-0 leading-relaxed flex items-start gap-1.5"
    role="note"
  >
    <i
      class="pi pi-info-circle text-[var(--hy-primary)] shrink-0 mt-0.5"
      aria-hidden="true"
    />
    <span>{{ text }}</span>
  </p>
</template>
