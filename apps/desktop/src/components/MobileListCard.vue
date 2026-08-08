<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  meta?: string;
  metaSeverity?: "success" | "warn" | "danger" | "info" | "secondary";
}>();

defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    class="hy-surface w-full text-right p-4 min-h-[4.5rem] transition-colors hover:border-[var(--hy-primary)] active:scale-[0.99]"
    @click="$emit('click')"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="font-semibold text-[var(--hy-text)] m-0 truncate">
          {{ title }}
        </p>
        <p
          v-if="subtitle"
          class="text-sm text-[var(--hy-muted)] m-0 mt-1 truncate"
        >
          {{ subtitle }}
        </p>
      </div>
      <span
        v-if="meta"
        class="text-xs shrink-0 px-2 py-1 rounded-full font-medium"
        :class="{
          'bg-[var(--hy-accent-soft)] text-[var(--hy-accent)]':
            !metaSeverity || metaSeverity === 'success',
          'bg-[var(--hy-danger-soft)] text-[var(--hy-danger)]':
            metaSeverity === 'danger',
          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200':
            metaSeverity === 'warn',
          'bg-[var(--hy-primary-soft)] text-[var(--hy-primary)]':
            metaSeverity === 'info',
          'bg-[var(--hy-border)] text-[var(--hy-muted)]':
            metaSeverity === 'secondary',
        }"
      >
        {{ meta }}
      </span>
    </div>
    <slot />
  </button>
</template>
