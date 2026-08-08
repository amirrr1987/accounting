import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

const ROUTES: Record<string, string> = {
  Digit1: "/",
  Digit2: "/accounts",
  Digit3: "/vouchers",
  Digit4: "/ledger",
  Digit5: "/trial-balance",
  Digit6: "/parties",
  Digit7: "/products",
  Digit8: "/invoices",
  KeyN: "/invoices/new",
};

/** میانبرهای صفحه‌کلید برای ناوبری سریع (Alt+عدد) */
export function useAppShortcuts(): void {
  const router = useRouter();

  function onKeydown(e: KeyboardEvent): void {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }
    const path = ROUTES[e.code];
    if (!path) return;
    e.preventDefault();
    void router.push(path);
  }

  onMounted(() => {
    window.addEventListener("keydown", onKeydown);
  });
  onUnmounted(() => {
    window.removeEventListener("keydown", onKeydown);
  });
}
