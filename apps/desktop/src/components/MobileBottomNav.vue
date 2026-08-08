<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { ux } from "@/locale/ux-copy";

const router = useRouter();
const route = useRoute();

const tabs = [
  { label: ux.nav.home, icon: "pi pi-home", path: "/" },
  { label: ux.nav.vouchers, icon: "pi pi-book", path: "/vouchers" },
  { label: ux.nav.invoices, icon: "pi pi-file", path: "/invoices" },
  { label: ux.nav.ledger, icon: "pi pi-list", path: "/ledger" },
  { label: "بیشتر", icon: "pi pi-ellipsis-h", path: "__more__" },
] as const;

const emit = defineEmits<{
  more: [];
}>();

function isActive(path: string): boolean {
  if (path === "/") return route.path === "/";
  if (path === "__more__") {
    return ["/accounts", "/trial-balance", "/parties", "/products"].some((p) =>
      route.path.startsWith(p),
    );
  }
  return route.path.startsWith(path);
}

function onTab(path: string): void {
  if (path === "__more__") {
    emit("more");
    return;
  }
  void router.push(path);
}
</script>

<template>
  <nav
    class="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--hy-border)] bg-[var(--hy-surface)]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    :aria-label="ux.nav.menu"
  >
    <ul class="grid grid-cols-5 gap-0 m-0 p-0 list-none">
      <li v-for="tab in tabs" :key="tab.path">
        <button
          type="button"
          class="flex flex-col items-center justify-center gap-0.5 min-h-[3.25rem] w-full text-[0.65rem] sm:text-xs transition-colors duration-200"
          :class="
            isActive(tab.path)
              ? 'text-[var(--hy-primary)] font-semibold'
              : 'text-[var(--hy-muted)]'
          "
          @click="onTab(tab.path)"
        >
          <i :class="[tab.icon, 'text-lg']" aria-hidden="true" />
          <span>{{ tab.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
