<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useExperienceMode } from "@/composables/useExperienceMode";
import {
  isNavActive,
  mobilePrimaryTabs,
  navLabel,
} from "@/lib/nav-config";
import { ux } from "@/locale/ux-copy";

const router = useRouter();
const route = useRoute();
const { mode } = useExperienceMode();

const emit = defineEmits<{ menu: [] }>();

const tabs = computed(() => [
  ...mobilePrimaryTabs(),
  {
    id: "menu",
    path: "__menu__",
    icon: "pi pi-th-large",
    simpleLabel: ux.nav.menuSimple,
    proLabel: ux.nav.menu,
    hint: "",
    group: "system" as const,
  },
]);

function labelFor(path: string): string {
  if (path === "__menu__") return ux.nav.menuSimple;
  const item = mobilePrimaryTabs().find((t) => t.path === path);
  return item ? navLabel(item, mode.value) : "";
}

function onTab(path: string): void {
  if (path === "__menu__") {
    emit("menu");
    return;
  }
  void router.push(path);
}

function active(path: string): boolean {
  if (path === "__menu__") return false;
  return isNavActive(path, route.path);
}
</script>

<template>
  <nav
    class="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--hy-border)] bg-[var(--hy-surface)]/98 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    :aria-label="ux.nav.menu"
  >
    <ul class="grid grid-cols-5 gap-0 m-0 p-0 list-none">
      <li v-for="tab in tabs" :key="tab.path">
        <button
          type="button"
          class="flex flex-col items-center justify-center gap-0.5 min-h-[3.5rem] w-full px-1 transition-colors duration-200"
          :class="
            active(tab.path)
              ? 'text-[var(--hy-primary)] font-semibold'
              : 'text-[var(--hy-muted)]'
          "
          @click="onTab(tab.path)"
        >
          <i :class="[tab.icon, 'text-xl']" aria-hidden="true" />
          <span class="text-[0.65rem] leading-tight text-center truncate max-w-full">
            {{ labelFor(tab.path) }}
          </span>
        </button>
      </li>
    </ul>
  </nav>
</template>
