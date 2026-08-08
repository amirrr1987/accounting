<script setup lang="ts">
import { computed } from "vue";
import Tag from "primevue/tag";
import Button from "primevue/button";
import { useExperienceMode } from "@/composables/useExperienceMode";
import { ux } from "@/locale/ux-copy";

defineProps<{
  badgeLabel: string;
  badgeSeverity: "success" | "info" | "danger";
  username?: string;
  isDark: boolean;
}>();

defineEmits<{
  toggleTheme: [];
  logout: [];
}>();

const { isSimple, toggleMode } = useExperienceMode();

const modeLabel = computed(() =>
  isSimple.value ? ux.nav.modeSimple : ux.nav.modePro,
);
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-[var(--hy-border)] bg-[var(--hy-surface)]/95 backdrop-blur-sm px-4 sm:px-6 min-h-14 flex items-center justify-between gap-3"
  >
    <div class="flex items-center gap-2 min-w-0">
      <Tag
        :value="badgeLabel"
        :severity="badgeSeverity"
        rounded
        class="text-xs shrink-0"
      />
      <span v-if="username" class="text-sm text-[var(--hy-muted)] truncate">
        {{ username }}
      </span>
    </div>
    <div class="flex items-center gap-1 shrink-0">
      <Button
        :label="modeLabel"
        text
        size="small"
        class="hidden sm:inline-flex min-h-11"
        @click="toggleMode"
      />
      <Button
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        text
        rounded
        class="hy-touch"
        :aria-label="isDark ? ux.nav.themeLight : ux.nav.themeDark"
        @click="$emit('toggleTheme')"
      />
      <Button
        icon="pi pi-sign-out"
        text
        rounded
        class="hy-touch"
        :aria-label="ux.nav.logout"
        @click="$emit('logout')"
      />
    </div>
  </header>
</template>
