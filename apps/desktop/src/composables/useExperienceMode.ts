import { computed, ref } from "vue";

const STORAGE_KEY = "hesabyar-experience-mode";

export type ExperienceMode = "simple" | "pro";

function readMode(): ExperienceMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "pro" || raw === "simple") return raw;
  } catch {
    /* ignore */
  }
  return "simple";
}

const mode = ref<ExperienceMode>(readMode());

export function useExperienceMode() {
  const isSimple = computed(() => mode.value === "simple");
  const isPro = computed(() => mode.value === "pro");

  function setMode(next: ExperienceMode): void {
    mode.value = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function toggleMode(): void {
    setMode(mode.value === "simple" ? "pro" : "simple");
  }

  return {
    mode,
    isSimple,
    isPro,
    setMode,
    toggleMode,
  };
}
