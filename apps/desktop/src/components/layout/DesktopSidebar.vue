<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import { useExperienceMode } from "@/composables/useExperienceMode";
import {
  groupedNavItems,
  isNavActive,
  navGroupMeta,
  navLabel,
  type NavGroupId,
} from "@/lib/nav-config";
import { ux } from "@/locale/ux-copy";

const router = useRouter();
const route = useRoute();
const { mode, isSimple, toggleMode } = useExperienceMode();

const groups = computed(() => groupedNavItems(mode.value));

function go(path: string): void {
  void router.push(path);
}
</script>

<template>
  <aside
    class="flex flex-col w-64 xl:w-72 shrink-0 border-l border-[var(--hy-border)] bg-[var(--hy-surface)] min-h-[100dvh] sticky top-0"
    :aria-label="ux.nav.menu"
  >
    <div class="p-4 border-b border-[var(--hy-border)]">
      <p class="font-bold text-lg text-[var(--hy-primary)] m-0">
        {{ ux.brand.name }}
      </p>
      <p class="text-xs text-[var(--hy-muted)] m-0 mt-1 leading-relaxed">
        {{ ux.brand.tagline }}
      </p>
    </div>

    <nav class="flex-1 overflow-y-auto p-3 space-y-5">
      <section v-for="{ group, items } in groups" :key="group">
        <div class="px-2 mb-2">
          <p class="text-xs font-semibold text-[var(--hy-text)] m-0">
            {{ navGroupMeta(group as NavGroupId).title }}
          </p>
          <p class="text-[0.65rem] text-[var(--hy-muted)] m-0 mt-0.5">
            {{ navGroupMeta(group as NavGroupId).subtitle }}
          </p>
        </div>
        <ul class="list-none m-0 p-0 space-y-0.5">
          <li v-for="item in items" :key="item.id">
            <button
              type="button"
              class="w-full text-right rounded-lg px-3 py-2.5 transition-colors duration-200 min-h-11"
              :class="
                isNavActive(item.path, route.path)
                  ? 'bg-[var(--hy-primary-soft)] text-[var(--hy-primary)] font-medium'
                  : 'text-[var(--hy-text)] hover:bg-[var(--hy-primary-soft)]/50'
              "
              @click="go(item.path)"
            >
              <span class="flex items-center gap-2.5">
                <i :class="item.icon" aria-hidden="true" />
                <span class="flex flex-col min-w-0">
                  <span class="text-sm truncate">{{
                    navLabel(item, mode)
                  }}</span>
                  <span
                    v-if="isSimple"
                    class="text-[0.65rem] text-[var(--hy-muted)] truncate font-normal"
                  >
                    {{ item.hint }}
                  </span>
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>
    </nav>

    <div class="p-3 border-t border-[var(--hy-border)]">
      <Button
        :label="isSimple ? ux.nav.modePro : ux.nav.modeSimple"
        :icon="isSimple ? 'pi pi-sliders-h' : 'pi pi-compass'"
        outlined
        class="w-full min-h-11 text-sm"
        @click="toggleMode"
      />
      <p class="text-[0.65rem] text-[var(--hy-muted)] m-0 mt-2 px-1 leading-relaxed">
        {{ isSimple ? ux.nav.modeSimpleHint : ux.nav.modeProHint }}
      </p>
    </div>
  </aside>
</template>
