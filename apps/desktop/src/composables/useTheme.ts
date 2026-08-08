import { computed, onMounted, ref, watch } from "vue";

const STORAGE_KEY = "hesabyar-theme";

export type ThemeMode = "light" | "dark";

const mode = ref<ThemeMode>("light");

function applyTheme(next: ThemeMode): void {
  const root = document.documentElement;
  if (next === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.colorScheme = next;
}

function readStored(): ThemeMode {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "dark" ? "dark" : "light";
}

/** تم روشن/تاریک با ذخیره در localStorage */
export function useTheme() {
  onMounted(() => {
    mode.value = readStored();
    applyTheme(mode.value);
  });

  watch(mode, (next) => {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  });

  const isDark = computed(() => mode.value === "dark");

  function toggle(): void {
    mode.value = mode.value === "dark" ? "light" : "dark";
  }

  function setTheme(next: ThemeMode): void {
    mode.value = next;
  }

  return { mode, isDark, toggle, setTheme };
}

/** اعمال تم قبل از mount برای جلوگیری از چشمک زدن */
export function initThemeEarly(): void {
  applyTheme(readStored());
  mode.value = readStored();
}
