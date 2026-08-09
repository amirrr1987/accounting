<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Tag from "primevue/tag";
import Button from "primevue/button";
import DesktopSidebar from "@/components/layout/DesktopSidebar.vue";
import DesktopTopBar from "@/components/layout/DesktopTopBar.vue";
import MobileNavDrawer from "@/components/layout/MobileNavDrawer.vue";
import MobileBottomNav from "@/components/MobileBottomNav.vue";
import QuickActionFab from "@/components/QuickActionFab.vue";
import { useBackendHealth } from "@/composables/useBackendHealth";
import { useTheme } from "@/composables/useTheme";
import { useAppShortcuts } from "@/composables/useAppShortcuts";
import { useAuth } from "@/composables/useAuth";
import { useViewport, useIsMobileRef } from "@/composables/useViewport";
import { applyMoneyDisplaySettings } from "@/composables/useMoneyDisplay";
import { fetchBusinessSettings, logout as apiLogout } from "@/lib/api";
import { ux } from "@/locale/ux-copy";

const router = useRouter();
const route = useRoute();
const { status } = useBackendHealth();
const { isDark, toggle } = useTheme();
const { isAuthenticated, user, clearSession } = useAuth();
const isMobile = useIsMobileRef();
useViewport();
useAppShortcuts();

const drawerOpen = ref(false);

const showChrome = computed(
  () => isAuthenticated.value && route.name !== "login",
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

function openMenu(): void {
  drawerOpen.value = true;
}

async function logout(): Promise<void> {
  try {
    await apiLogout();
  } catch {
    /* نشست محلی را حتی اگر API در دسترس نباشد پاک می‌کنیم */
  }
  clearSession();
  drawerOpen.value = false;
  await router.push("/login");
}

async function loadMoneyDisplay(): Promise<void> {
  if (!isAuthenticated.value) return;
  try {
    const settings = await fetchBusinessSettings();
    applyMoneyDisplaySettings(settings);
  } catch {
    /* defaults: RIAL */
  }
}

watch(
  isAuthenticated,
  (authed) => {
    if (authed) void loadMoneyDisplay();
  },
  { immediate: true },
);
</script>

<template>
  <div class="min-h-[100dvh] bg-transparent" dir="rtl">
    <!-- Desktop shell -->
    <div v-if="showChrome && !isMobile" class="flex min-h-[100dvh]">
      <DesktopSidebar />
      <div class="flex flex-1 flex-col min-w-0">
        <DesktopTopBar
          :badge-label="badge.label"
          :badge-severity="badge.severity"
          :username="user?.username"
          :is-dark="isDark"
          @toggle-theme="toggle"
          @logout="logout"
        />
        <main class="flex-1 bg-[var(--hy-bg)]">
          <router-view />
        </main>
      </div>
    </div>

    <!-- Mobile shell -->
    <template v-else-if="showChrome && isMobile">
      <header
        class="sticky top-0 z-40 border-b border-[var(--hy-border)] bg-[var(--hy-surface)]/95 backdrop-blur-sm"
      >
        <div class="flex items-center justify-between gap-2 px-4 min-h-14">
          <div class="min-w-0">
            <p class="font-bold text-[var(--hy-primary)] m-0 leading-tight">
              {{ ux.brand.name }}
            </p>
            <p class="text-[0.65rem] text-[var(--hy-muted)] m-0 truncate">
              {{ ux.brand.tagline }}
            </p>
          </div>
          <div class="flex items-center gap-0.5 shrink-0">
            <Tag
              :value="badge.label"
              :severity="badge.severity"
              rounded
              class="text-[0.6rem] max-w-[4.5rem] truncate hidden xs:inline-flex"
            />
            <Button
              :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
              text
              rounded
              class="hy-touch"
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
      </header>

      <main
        class="pb-[calc(4.5rem+env(safe-area-inset-bottom))] bg-[var(--hy-bg)] min-h-[calc(100dvh-3.5rem)]"
      >
        <router-view />
      </main>

      <QuickActionFab />
      <MobileBottomNav @menu="openMenu" />
      <MobileNavDrawer v-model:visible="drawerOpen" />
    </template>

    <!-- Login / unauthenticated -->
    <main v-else>
      <router-view />
    </main>
  </div>
</template>
