<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import { formatBusinessTitle } from "@hesabyar/shared";
import type { DashboardSummary } from "@hesabyar/shared";
import { fetchDashboard, fetchBusinessSettings } from "@/lib/api";
import { applyMoneyDisplaySettings } from "@/composables/useMoneyDisplay";
import { useIsMobileRef } from "@/composables/useViewport";
import { useBackendHealth } from "@/composables/useBackendHealth";
import MoneySetupDialog from "@/components/MoneySetupDialog.vue";
import HomeViewMobile from "@/views/home/HomeViewMobile.vue";
import HomeViewDesktop from "@/views/home/HomeViewDesktop.vue";
import { ux } from "@/locale/ux-copy";

const toast = useToast();
const { status, version } = useBackendHealth();
const isMobile = useIsMobileRef();

const summary = ref<DashboardSummary | null>(null);
const businessTitle = ref<string | null>(null);
const loading = ref(false);
const loadFailed = ref(false);
const moneySetupOpen = ref(false);

const healthLabel = computed(() => {
  if (status.value === "connected") return ux.health.connected;
  if (status.value === "checking") return ux.health.checking;
  return ux.health.disconnected;
});

const healthSeverity = computed(() => {
  if (status.value === "connected") return "success" as const;
  if (status.value === "checking") return "info" as const;
  return "danger" as const;
});

async function load(): Promise<void> {
  loading.value = true;
  loadFailed.value = false;
  try {
    const [dash, business] = await Promise.all([
      fetchDashboard(),
      fetchBusinessSettings(),
    ]);
    summary.value = dash;
    businessTitle.value = formatBusinessTitle(business);
    applyMoneyDisplaySettings(business);
    if (!business.moneyDisplayConfigured) {
      moneySetupOpen.value = true;
    }
  } catch {
    loadFailed.value = true;
    toast.add({
      severity: "error",
      summary: ux.dashboard.loadErrorTitle,
      detail: ux.dashboard.loadErrorDetail,
      life: 4500,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div dir="rtl">
    <Toast />
    <MoneySetupDialog v-model:visible="moneySetupOpen" />

    <HomeViewMobile
      v-if="isMobile"
      :summary="summary"
      :business-title="businessTitle"
      :loading="loading"
      :load-failed="loadFailed"
      :health-label="healthLabel"
      :health-severity="healthSeverity"
      :version="version"
      @retry="load"
    />
    <HomeViewDesktop
      v-else
      :summary="summary"
      :business-title="businessTitle"
      :loading="loading"
      :load-failed="loadFailed"
      :health-label="healthLabel"
      :health-severity="healthSeverity"
      :version="version"
      @retry="load"
    />
  </div>
</template>
