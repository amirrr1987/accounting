import { onMounted, onUnmounted, ref } from "vue";

const MOBILE_MAX = 768;

/** تشخیص موبایل/تبلت برای layout جدا */
export function useViewport() {
  const isMobile = ref(false);

  function update(): void {
    const narrow = window.innerWidth < MOBILE_MAX;
    const coarse =
      window.matchMedia("(pointer: coarse)").matches &&
      window.innerWidth < 1024;
    isMobile.value = narrow || coarse;
  }

  onMounted(() => {
    update();
    window.addEventListener("resize", update);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", update);
  });

  return { isMobile };
}
