<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Drawer from "primevue/drawer";
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

const visible = defineModel<boolean>("visible", { default: false });

const router = useRouter();
const route = useRoute();
const { mode, isSimple, toggleMode } = useExperienceMode();

const groups = computed(() => groupedNavItems(mode.value));

function go(path: string): void {
  visible.value = false;
  void router.push(path);
}
</script>

<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    class="w-[min(100vw,20rem)]"
    :header="ux.nav.menu"
  >
    <div class="flex flex-col gap-4 -mt-2">
      <Button
        :label="isSimple ? ux.nav.modePro : ux.nav.modeSimple"
        :icon="isSimple ? 'pi pi-sliders-h' : 'pi pi-compass'"
        outlined
        class="min-h-11 w-full"
        @click="toggleMode"
      />
      <p class="text-xs text-[var(--hy-muted)] m-0 -mt-2 leading-relaxed">
        {{ isSimple ? ux.nav.modeSimpleHint : ux.nav.modeProHint }}
      </p>

      <nav class="space-y-5" :aria-label="ux.nav.menu">
        <section v-for="{ group, items } in groups" :key="group">
          <p class="text-xs font-semibold text-[var(--hy-text)] m-0 px-1">
            {{ navGroupMeta(group as NavGroupId).title }}
          </p>
          <p class="text-[0.65rem] text-[var(--hy-muted)] m-0 mt-0.5 mb-2 px-1">
            {{ navGroupMeta(group as NavGroupId).subtitle }}
          </p>
          <ul class="list-none m-0 p-0 space-y-0.5">
            <li v-for="item in items" :key="item.id">
              <button
                type="button"
                class="w-full text-right rounded-xl px-3 py-3 min-h-[3rem] transition-colors"
                :class="
                  isNavActive(item.path, route.path)
                    ? 'bg-[var(--hy-primary-soft)] text-[var(--hy-primary)] font-medium'
                    : 'hover:bg-[var(--hy-primary-soft)]/40'
                "
                @click="go(item.path)"
              >
                <span class="flex items-center gap-3">
                  <i :class="[item.icon, 'text-lg']" aria-hidden="true" />
                  <span class="flex flex-col text-right min-w-0">
                    <span class="text-sm">{{ navLabel(item, mode) }}</span>
                    <span class="text-[0.65rem] text-[var(--hy-muted)] font-normal">
                      {{ item.hint }}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </section>
      </nav>
    </div>
  </Drawer>
</template>
