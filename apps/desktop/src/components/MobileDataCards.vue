<script setup lang="ts">
import MobileListCard from "@/components/MobileListCard.vue";

export type MobileCardItem = {
  key: string;
  title: string;
  subtitle?: string;
  meta?: string;
  metaSeverity?: "success" | "warn" | "danger" | "info" | "secondary";
};

defineProps<{
  items: MobileCardItem[];
  empty?: string;
}>();

defineEmits<{ click: [key: string] }>();
</script>

<template>
  <p
    v-if="items.length === 0 && empty"
    class="text-sm text-[var(--hy-muted)] m-0 py-2"
  >
    {{ empty }}
  </p>
  <ul v-else class="list-none m-0 p-0 space-y-2">
    <li v-for="item in items" :key="item.key">
      <MobileListCard
        :title="item.title"
        :subtitle="item.subtitle"
        :meta="item.meta"
        :meta-severity="item.metaSeverity"
        @click="$emit('click', item.key)"
      />
    </li>
  </ul>
</template>
