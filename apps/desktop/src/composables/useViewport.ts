import { onMounted, onUnmounted, ref } from "vue";

const MOBILE_MAX = 768;

const isMobile = ref(false);

function updateViewport(): void {
  if (typeof window === "undefined") return;
  const narrow = window.innerWidth < MOBILE_MAX;
  const coarse =
    window.matchMedia("(pointer: coarse)").matches &&
    window.innerWidth < 1024;
  isMobile.value = narrow || coarse;
}

if (typeof window !== "undefined") {
  updateViewport();
}

let listenerCount = 0;

function attach(): void {
  if (listenerCount === 0) {
    updateViewport();
    window.addEventListener("resize", updateViewport);
  }
  listenerCount += 1;
}

function detach(): void {
  listenerCount -= 1;
  if (listenerCount <= 0) {
    listenerCount = 0;
    window.removeEventListener("resize", updateViewport);
  }
}

/** تشخیص موبایل/تبلت — state مشترک در کل اپ */
export function useViewport() {
  onMounted(() => {
    attach();
  });

  onUnmounted(() => {
    detach();
  });

  return { isMobile };
}

export function useIsMobileRef() {
  return isMobile;
}
