import { ref, onMounted, onUnmounted } from "vue";
import { fetchHealth } from "@/lib/api";

export type HealthStatus = "checking" | "connected" | "disconnected";

/** وضعیت اتصال دسکتاپ به NestJS */
export function useBackendHealth(pollMs = 5000) {
  const status = ref<HealthStatus>("checking");
  const version = ref<string | null>(null);
  let timer: ReturnType<typeof setInterval> | undefined;

  async function check(): Promise<void> {
    try {
      const health = await fetchHealth();
      status.value = "connected";
      version.value = health.version;
    } catch {
      status.value = "disconnected";
      version.value = null;
    }
  }

  onMounted(() => {
    void check();
    timer = setInterval(() => {
      void check();
    }, pollMs);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { status, version, check };
}
