<script setup lang="ts">
import Menubar from "primevue/menubar";
import Drawer from "primevue/drawer";
import Tag from "primevue/tag";
import Button from "primevue/button";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import MobileBottomNav from "@/components/MobileBottomNav.vue";
import { useBackendHealth } from "@/composables/useBackendHealth";
import { useTheme } from "@/composables/useTheme";
import { useAppShortcuts } from "@/composables/useAppShortcuts";
import { useAuth } from "@/composables/useAuth";
import { useViewport } from "@/composables/useViewport";
import { usePermissions } from "@/composables/usePermissions";
import { ux } from "@/locale/ux-copy";

const router = useRouter();
const route = useRoute();
const { status } = useBackendHealth();
const { isDark, toggle } = useTheme();
const { isAuthenticated, user, clearSession } = useAuth();
const { isMobile } = useViewport();
const { isAdmin: isAdminUser } = usePermissions();
useAppShortcuts();

const drawerOpen = ref(false);

const showChrome = computed(
  () => isAuthenticated.value && route.name !== "login",
);

type NavItem = { label: string; icon: string; path: string };

const navItems = computed((): NavItem[] => [
  { label: ux.nav.home, icon: "pi pi-home", path: "/" },
  { label: ux.nav.accounts, icon: "pi pi-sitemap", path: "/accounts" },
  { label: ux.nav.vouchers, icon: "pi pi-book", path: "/vouchers" },
  { label: ux.nav.ledger, icon: "pi pi-list", path: "/ledger" },
  { label: ux.nav.trialBalance, icon: "pi pi-chart-bar", path: "/trial-balance" },
  { label: ux.nav.parties, icon: "pi pi-users", path: "/parties" },
  { label: ux.nav.products, icon: "pi pi-box", path: "/products" },
  { label: "واحدها", icon: "pi pi-sliders-h", path: "/units" },
  { label: ux.nav.invoices, icon: "pi pi-file", path: "/invoices" },
  { label: ux.nav.payments, icon: "pi pi-wallet", path: "/payments/new" },
  { label: ux.nav.reports, icon: "pi pi-chart-line", path: "/reports" },
  { label: ux.nav.fiscal, icon: "pi pi-lock", path: "/fiscal-years" },
  ...(isAdminUser.value
    ? [{ label: ux.nav.settings, icon: "pi pi-cog", path: "/settings" }]
    : []),
]);

/** آیتم‌های فقط در drawer موبایل (تب «بیشتر») */
const mobileMoreItems = computed(() =>
  navItems.value.filter(
    (item) =>
      !["/", "/vouchers", "/invoices", "/ledger"].includes(item.path),
  ),
);

const menuItems = computed(() =>
  navItems.value.map((item) => ({
  label: item.label,
  icon: item.icon,
  command: () => {
    void router.push(item.path);
  },
})),
);

const badge = computed(() => {
  if (status.value === "connected") {
    return { label: ux.health.connected, severity: "success" as const };
  }
  if (status.value === "checking") {
    return { label: ux.health.checking, severity: "info" as const };
  }
  return { label: ux.health.disconnected, severity: "danger" as const };
});

function go(path: string): void {
  drawerOpen.value = false;
  void router.push(path);
}

function isActive(path: string): boolean {
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
}

function openMoreDrawer(): void {
  drawerOpen.value = true;
}

async function logout(): Promise<void> {
  clearSession();
  drawerOpen.value = false;
  await router.push("/login");
}
</script>

<template>
  <div class="min-h-[100dvh] bg-transparent" dir="rtl">
    <header
      v-if="showChrome"
      class="sticky top-0 z-40 border-b border-[var(--hy-border)] bg-[var(--hy-surface)]/95 backdrop-blur-sm"
    >
      <!-- Mobile: نوار بالا + bottom nav -->
      <div
        v-if="isMobile"
        class="flex items-center justify-between gap-2 px-3 min-h-14"
      >
        <span class="font-bold text-[var(--hy-primary)]">{{ ux.brand.name }}</span>
        <div class="flex items-center gap-1">
          <Tag
            :value="badge.label"
            :severity="badge.severity"
            rounded
            class="text-[0.65rem] max-w-[5.5rem] truncate"
          />
          <Button
            :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
            text
            rounded
            class="hy-touch"
            :aria-label="isDark ? ux.nav.themeLight : ux.nav.themeDark"
            @click="toggle"
          />
          <Button
            icon="pi pi-sign-out"
            text
            rounded
            class="hy-touch"
            :aria-label="ux.nav.logout"
            @click="logout"
          />
        </div>
      </div>

      <!-- Desktop menubar -->
      <Menubar
        v-else
        :model="menuItems"
        class="flex rounded-none border-0 border-b-0"
      >
        <template #end>
          <div class="flex items-center gap-2 px-2">
            <Button
              :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
              text
              rounded
              class="hy-touch"
              :aria-label="isDark ? ux.nav.themeLight : ux.nav.themeDark"
              @click="toggle"
            />
            <span
              v-if="user"
              class="text-sm text-[var(--hy-muted)] max-w-[8rem] truncate"
            >
              {{ user.username }}
            </span>
            <Button
              icon="pi pi-sign-out"
              text
              rounded
              class="hy-touch"
              :aria-label="ux.nav.logout"
              @click="logout"
            />
            <span class="font-bold text-[var(--hy-primary)]">{{ ux.brand.name }}</span>
            <Tag
              :value="badge.label"
              :severity="badge.severity"
              rounded
              class="text-xs"
            />
          </div>
        </template>
      </Menubar>
    </header>

    <Drawer
      v-model:visible="drawerOpen"
      position="right"
      class="w-72"
      :header="ux.nav.menu"
    >
      <nav class="flex flex-col gap-1" :aria-label="ux.nav.menu">
        <button
          v-for="item in isMobile ? mobileMoreItems : navItems"
          :key="item.path"
          type="button"
          class="flex items-center gap-3 min-h-11 px-3 rounded-lg text-right transition-colors duration-200"
          :class="
            isActive(item.path)
              ? 'bg-[var(--hy-primary-soft)] text-[var(--hy-primary)] font-medium'
              : 'text-[var(--hy-text)] hover:bg-[var(--hy-primary-soft)]/60'
          "
          @click="go(item.path)"
        >
          <i :class="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <p class="text-xs text-[var(--hy-muted)] mt-6 px-1">
        {{ badge.label }}
        <span v-if="user"> · {{ user.username }}</span>
      </p>
    </Drawer>

    <main :class="showChrome && isMobile ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : ''">
      <router-view />
    </main>

    <MobileBottomNav
      v-if="showChrome && isMobile"
      @more="openMoreDrawer"
    />
  </div>
</template>
