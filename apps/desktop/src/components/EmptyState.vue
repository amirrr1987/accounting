<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 py-14 px-4 text-center"
    role="status"
  >
    <div
      class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--hy-primary-soft)] text-[var(--hy-primary)]"
      aria-hidden="true"
    >
      <i :class="[icon ?? 'pi pi-inbox', 'text-2xl']" />
    </div>
    <h2 class="text-lg font-bold text-[var(--hy-text)] m-0">{{ title }}</h2>
    <p
      v-if="description"
      class="text-sm text-[var(--hy-muted)] max-w-md m-0 leading-relaxed"
    >
      {{ description }}
    </p>
    <slot />
    <button
      v-if="actionLabel"
      type="button"
      class="hy-btn-primary mt-2 min-h-11 min-w-[11rem] px-4 rounded-lg font-medium transition-colors duration-200"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
